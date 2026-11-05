// Restore saves before C++ opens its record stores. Changes are persisted on close.
Module.preRun = Module.preRun || [];
Module.preRun.push(function () {
  FS.mkdir('/saves');
  FS.mount(IDBFS, { autoPersist: true }, '/saves');
  addRunDependency('restore-saves');
  FS.syncfs(true, function (error) {
    if (error) {
      console.warn('Could not restore browser saves:', error);
      document.getElementById('storage-status').textContent =
        'Browser storage is unavailable. Progress may not survive a reload.';
    }
    removeRunDependency('restore-saves');
  });
});
