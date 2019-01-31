module.exports = windowType => {
  const { ipcRenderer, webFrame } = require('electron');

  if (process.env.TEST_MODE) {
    window.electronRequire = require;
  }

  // disable pinch zoom
  webFrame.setZoomLevelLimits(1, 1);

  require('./consoleLogCapture')(windowType); // !!!
  require('./suppressWindowPrompt')();

  // register with window manager
  ipcRenderer.send('backendAction_setWindowId');
};
