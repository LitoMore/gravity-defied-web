// All devices share logical keys so releasing one never releases another's hold.
(function () {
  'use strict';
  const canvas = document.getElementById('canvas');
  const status = document.getElementById('gamepad-status');
  const keyCodes = { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Enter: 13, Escape: 27 };
  // Physical QWERTY positions form an eight-way pad with confirm in the center.
  const letterBindings = {
    KeyQ: ['ArrowUp', 'ArrowLeft'], KeyW: ['ArrowUp'], KeyE: ['ArrowUp', 'ArrowRight'],
    KeyA: ['ArrowLeft'], KeyS: ['Enter'], KeyD: ['ArrowRight'],
    KeyZ: ['ArrowDown', 'ArrowLeft'], KeyX: ['ArrowDown'], KeyC: ['ArrowDown', 'ArrowRight']
  };
  const sources = new Map();
  const pointers = new Map();
  const synthetic = new WeakSet();
  let gamepadIndex = null;
  let axisKeys = new Set();
  let waitForNeutral = false;
  let running = false;

  function setStatus(text) {
    if (status.textContent !== text) status.textContent = text;
  }

  function sendKey(type, key) {
    const event = new KeyboardEvent(type, { key, code: key, keyCode: keyCodes[key], which: keyCodes[key], bubbles: true });
    synthetic.add(event);
    window.dispatchEvent(event);
  }

  function allKeys() {
    return new Set([...sources.values()].flatMap(keys => [...keys]));
  }

  function update(source, keys) {
    const before = allKeys();
    if (keys.size) sources.set(source, keys);
    else sources.delete(source);
    const after = allKeys();
    for (const key of before) if (!after.has(key)) sendKey('keyup', key);
    for (const key of after) if (!before.has(key)) sendKey('keydown', key);
  }

  function releasePointer(id) {
    const button = pointers.get(id);
    pointers.delete(id);
    update('pointer:' + id, new Set());
    if (button && ![...pointers.values()].includes(button)) button.classList.remove('held');
  }

  document.querySelectorAll('[data-key]').forEach(button => {
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      canvas.focus({ preventScroll: true });
      button.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, button);
      button.classList.add('held');
      update('pointer:' + event.pointerId, new Set([button.dataset.key]));
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      button.addEventListener(type, event => releasePointer(event.pointerId));
    }
    button.addEventListener('click', event => {
      if (event.detail === 0) {
        update('button', new Set([button.dataset.key]));
        update('button', new Set());
      }
    });
    button.addEventListener('contextmenu', event => event.preventDefault());
  });

  // Capture real keyboard events before SDL sees them; SDL receives the merged
  // synthetic events. Keep normal keyboard auto-repeat for menu navigation.
  for (const type of ['keydown', 'keyup']) {
    window.addEventListener(type, event => {
      if (synthetic.has(event)) return;
      const source = 'keyboard:' + (event.code || event.key.toLowerCase());
      // Always release a tracked key, even if modifiers or focus changed while held.
      if (type === 'keyup' && sources.has(source)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        update(source, new Set());
        return;
      }
      const keys = letterBindings[event.code]
        || letterBindings['Key' + event.key.toUpperCase()]
        || (keyCodes[event.key] ? [event.key] : null);
      if (!keys || event.ctrlKey || event.metaKey || event.altKey) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (type === 'keydown' && event.repeat && sources.has(source)) {
        for (const key of keys) sendKey(type, key);
      } else update(source, new Set(type === 'keydown' ? keys : []));
    }, true);
  }

  function clearInputs() {
    for (const key of allKeys()) sendKey('keyup', key);
    sources.clear();
    for (const button of pointers.values()) button.classList.remove('held');
    pointers.clear();
    axisKeys.clear();
    waitForNeutral = true;
  }
  window.addEventListener('blur', clearInputs);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearInputs(); });
  window.addEventListener('pagehide', () => { running = false; clearInputs(); });

  function pollGamepad() {
    if (!running) return;
    window.requestAnimationFrame(pollGamepad);
    if (document.hidden || !document.hasFocus()) return;
    let pads;
    try {
      pads = Array.from(navigator.getGamepads());
    } catch (error) {
      update('gamepad', new Set());
      setStatus('Gamepad access is unavailable in this browser or page.');
      return;
    }
    const pad = pads.find(pad => pad && pad.connected && pad.mapping === 'standard');
    if (!pad) {
      update('gamepad', new Set());
      axisKeys.clear();
      gamepadIndex = null;
      setStatus(pads.some(pad => pad && pad.connected)
        ? 'This controller has no standard browser mapping. Use keyboard or touch controls.'
        : 'Connect a controller and press a button to enable it.');
      return;
    }
    if (pad.index !== gamepadIndex) {
      update('gamepad', new Set());
      axisKeys.clear();
      gamepadIndex = pad.index;
    }
    setStatus('Controller connected: ' + pad.id);
    const keys = new Set();
    const pressed = index => !!pad.buttons[index] && (pad.buttons[index].pressed || pad.buttons[index].value > 0.5);
    // Standard Gamepad layout: https://w3c.github.io/gamepad/#remapping
    const directions = [
      ['ArrowLeft', 14, -(pad.axes[0] || 0)], ['ArrowRight', 15, pad.axes[0] || 0],
      ['ArrowUp', 12, -(pad.axes[1] || 0)], ['ArrowDown', 13, pad.axes[1] || 0]
    ];
    for (const [key, button, value] of directions) {
      // Hysteresis avoids flickering when a stick hovers near its threshold.
      if (value > (axisKeys.has(key) ? 0.35 : 0.55)) axisKeys.add(key);
      else axisKeys.delete(key);
      if (pressed(button) || axisKeys.has(key)) keys.add(key);
    }
    if (pressed(7)) keys.add('ArrowUp');
    if (pressed(6)) keys.add('ArrowDown');
    if (pressed(0)) keys.add('Enter');
    if (pressed(1) || pressed(9)) keys.add('Escape');
    if (waitForNeutral) {
      if (keys.size === 0) waitForNeutral = false;
      return;
    }
    update('gamepad', keys);
  }

  function startPolling() {
    if (running || !navigator.getGamepads) return;
    running = true;
    window.requestAnimationFrame(pollGamepad);
  }
  window.addEventListener('gamepaddisconnected', event => {
    if (event.gamepad.index === gamepadIndex) {
      update('gamepad', new Set());
      axisKeys.clear();
      gamepadIndex = null;
      setStatus('Controller disconnected. Keyboard and touch controls are available.');
    }
  });
  window.addEventListener('pageshow', startPolling);
  if (!navigator.getGamepads) setStatus('Gamepad support requires a compatible browser on HTTPS or localhost.');
  startPolling();
})();
