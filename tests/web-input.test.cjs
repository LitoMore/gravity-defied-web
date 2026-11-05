const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

const script = readFileSync(new URL('../web/input.js', `file://${__filename}`), 'utf8');
class UIEvent extends Event {
  constructor(type, { bubbles = false, ...fields } = {}) { super(type, { cancelable: true, bubbles }); Object.assign(this, fields); }
}
function fixture({ supported = true } = {}) {
  const window = new EventTarget();
  const document = new EventTarget();
  const buttons = ['ArrowUp', 'Enter'].map(key => Object.assign(new EventTarget(), {
    dataset: { key }, classList: { add() {}, remove() {} }, setPointerCapture() {}
  }));
  const canvas = { focus() {} };
  const status = { textContent: '' };
  let focused = true;
  document.hidden = false;
  document.hasFocus = () => focused;
  document.getElementById = id => id === 'canvas' ? canvas : status;
  document.querySelectorAll = () => buttons;
  let pads = [];
  let frames = [];
  window.requestAnimationFrame = callback => frames.push(callback);
  const navigator = supported ? { getGamepads: () => pads } : {};
  vm.runInNewContext(script, { window, document, navigator, KeyboardEvent: UIEvent });
  const events = [];
  for (const type of ['keydown', 'keyup']) window.addEventListener(type, event => events.push([type, event.key]));
  return {
    window, document, navigator, events, status, buttons,
    pads(value) { pads = value; },
    focus(value) { focused = value; window.dispatchEvent(new Event(value ? 'focus' : 'blur')); },
    frame() { const callbacks = frames; frames = []; callbacks.forEach(callback => callback()); },
    keyboard(type, key, repeat = false) { window.dispatchEvent(new UIEvent(type, { key, code: key, repeat })); },
    disconnect(pad) { pads = []; window.dispatchEvent(new UIEvent('gamepaddisconnected', { gamepad: pad })); }
  };
}
function pad(index = 0) {
  return { index, id: 'Test controller', mapping: 'standard', connected: true,
    axes: [0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
}
const down = key => ['keydown', key];
const up = key => ['keyup', key];

test('D-pad diagonals, hotplug and disconnect release only changed keys', () => {
  const f = fixture(); const p = pad(2);
  f.frame(); f.pads([null, null, p]);
  p.buttons[12].pressed = p.buttons[15].pressed = true;
  f.frame(); f.frame();
  assert.deepEqual(f.events, [down('ArrowRight'), down('ArrowUp')]);
  assert.match(f.status.textContent, /Test controller/);
  p.buttons[15].pressed = false; f.frame();
  f.disconnect(p);
  assert.deepEqual(f.events.slice(2), [up('ArrowRight'), up('ArrowUp')]);
});

test('stick dead zone and hysteresis prevent drift and threshold chatter', () => {
  const f = fixture(); const p = pad(); f.pads([p]);
  for (const value of [0.1, 0.4, 0.54]) { p.axes[0] = value; f.frame(); }
  assert.deepEqual(f.events, []);
  for (const value of [0.6, 0.5, 0.4, 0.34]) { p.axes[0] = value; f.frame(); }
  assert.deepEqual(f.events, [down('ArrowRight'), up('ArrowRight')]);
  p.axes = [-0.9, -0.9]; f.frame();
  assert.deepEqual(f.events.slice(2), [down('ArrowLeft'), down('ArrowUp')]);
});

test('triggers and face/menu buttons map to controls without repeating held presses', () => {
  const f = fixture(); const p = pad(); f.pads([p]);
  for (const [button, key] of [[7, 'ArrowUp'], [6, 'ArrowDown'], [0, 'Enter'], [1, 'Escape'], [9, 'Escape']]) {
    f.events.length = 0;
    p.buttons[button].value = 0.8; f.frame(); f.frame(); f.frame();
    p.buttons[button].value = 0; f.frame();
    assert.deepEqual(f.events, [down(key), up(key)]);
  }
});

test('keyboard, touch and gamepad holds do not release each other', () => {
  const f = fixture(); const p = pad(); f.pads([p]);
  f.keyboard('keydown', 'ArrowUp');
  p.buttons[7].pressed = true; f.frame();
  f.buttons[0].dispatchEvent(new UIEvent('pointerdown', { pointerId: 1 }));
  f.keyboard('keyup', 'ArrowUp');
  f.disconnect(p);
  assert.deepEqual(f.events, [down('ArrowUp')]);
  f.buttons[0].dispatchEvent(new UIEvent('pointercancel', { pointerId: 1 }));
  assert.deepEqual(f.events, [down('ArrowUp'), up('ArrowUp')]);
});

test('keyboard auto-repeat remains available and pointer capture loss releases', () => {
  const f = fixture();
  f.keyboard('keydown', 'ArrowUp'); f.keyboard('keydown', 'ArrowUp', true);
  f.keyboard('keyup', 'ArrowUp');
  f.buttons[0].dispatchEvent(new UIEvent('pointerdown', { pointerId: 1 }));
  f.buttons[0].dispatchEvent(new UIEvent('pointerdown', { pointerId: 2 }));
  f.buttons[0].dispatchEvent(new UIEvent('lostpointercapture', { pointerId: 1 }));
  assert.deepEqual(f.events, [down('ArrowUp'), down('ArrowUp'), up('ArrowUp'), down('ArrowUp')]);
  f.buttons[0].dispatchEvent(new UIEvent('lostpointercapture', { pointerId: 2 }));
  assert.deepEqual(f.events.at(-1), up('ArrowUp'));
});

test('blur and hidden tabs release inputs, resume requires neutral controller', () => {
  const f = fixture(); const p = pad(); f.pads([p]);
  p.buttons[7].pressed = true; f.frame();
  f.focus(false); f.frame(); f.focus(true); f.frame();
  assert.deepEqual(f.events, [down('ArrowUp'), up('ArrowUp')]);
  p.buttons[7].pressed = false; f.frame();
  p.buttons[7].pressed = true; f.frame();
  f.document.hidden = true; f.document.dispatchEvent(new Event('visibilitychange')); f.frame();
  assert.deepEqual(f.events, [down('ArrowUp'), up('ArrowUp'), down('ArrowUp'), up('ArrowUp')]);
});

test('unsupported, blocked and nonstandard controllers degrade to other inputs', () => {
  const unsupported = fixture({ supported: false });
  assert.match(unsupported.status.textContent, /HTTPS or localhost/);
  unsupported.keyboard('keydown', 'Enter');
  assert.deepEqual(unsupported.events, [down('Enter')]);
  const f = fixture(); const p = pad(); p.mapping = ''; p.buttons[0].pressed = true;
  f.pads([p]); f.frame();
  assert.deepEqual(f.events, []); assert.match(f.status.textContent, /no standard/);
  p.mapping = 'standard'; p.buttons[0].pressed = false; p.buttons[7].pressed = true; f.frame();
  f.navigator.getGamepads = () => { throw new Error('Permission denied'); }; f.frame();
  assert.deepEqual(f.events, [down('ArrowUp'), up('ArrowUp')]);
  assert.match(f.status.textContent, /unavailable/);
});

test('only the first standard controller drives the game, next one takes over on disconnect', () => {
  const f = fixture(); const first = pad(); const second = pad(1);
  first.buttons[12].pressed = true; second.buttons[13].pressed = true;
  f.pads([first, second]); f.frame();
  assert.deepEqual(f.events, [down('ArrowUp')]);
  f.pads([null, second]); f.frame();
  assert.deepEqual(f.events, [down('ArrowUp'), up('ArrowUp'), down('ArrowDown')]);
});

test('QWE / ASD / ZXC provide eight directions and center confirm', () => {
  const mapping = {
    q: ['ArrowUp', 'ArrowLeft'], w: ['ArrowUp'], e: ['ArrowUp', 'ArrowRight'],
    a: ['ArrowLeft'], s: ['Enter'], d: ['ArrowRight'],
    z: ['ArrowDown', 'ArrowLeft'], x: ['ArrowDown'], c: ['ArrowDown', 'ArrowRight']
  };
  for (const [letter, keys] of Object.entries(mapping)) {
    const f = fixture();
    f.keyboard('keydown', letter); f.keyboard('keyup', letter);
    assert.deepEqual(f.events, [...keys.map(down), ...keys.map(up)], letter);
  }
});

test('diagonal aliases share component holds with other keys and controllers', () => {
  const f = fixture(); const p = pad(); f.pads([p]);
  f.keyboard('keydown', 'e');
  f.keyboard('keydown', 'w'); f.keyboard('keydown', 'ArrowRight');
  p.buttons[7].pressed = true; f.frame();
  f.keyboard('keyup', 'e'); f.keyboard('keyup', 'w');
  assert.deepEqual(f.events, [down('ArrowUp'), down('ArrowRight')]);
  f.disconnect(p); f.keyboard('keyup', 'ArrowRight');
  assert.deepEqual(f.events, [down('ArrowUp'), down('ArrowRight'), up('ArrowUp'), up('ArrowRight')]);
});

test('physical key positions survive Shift, layout changes and modified key releases', () => {
  const f = fixture();
  f.window.dispatchEvent(new UIEvent('keydown', { key: 'Й', code: 'KeyQ', shiftKey: true }));
  f.window.dispatchEvent(new UIEvent('keyup', { key: 'q', code: 'KeyQ', ctrlKey: true }));
  assert.deepEqual(f.events, [down('ArrowUp'), down('ArrowLeft'), up('ArrowUp'), up('ArrowLeft')]);
});

test('letter aliases keep Ctrl/Cmd/Alt shortcuts and repeat both diagonal components', () => {
  const f = fixture();
  for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
    const event = new UIEvent('keydown', { key: 'w', code: 'KeyW', [modifier]: true });
    f.window.dispatchEvent(event);
    assert.equal(event.defaultPrevented, false);
  }
  // Unhandled shortcuts are left to the browser, not converted to arrow events.
  assert(f.events.every(([, key]) => key === 'w'));
  f.events.length = 0;
  f.keyboard('keydown', 'z'); f.keyboard('keydown', 'z', true); f.focus(false);
  assert.deepEqual(f.events, [down('ArrowDown'), down('ArrowLeft'), down('ArrowDown'), down('ArrowLeft'), up('ArrowDown'), up('ArrowLeft')]);
});
