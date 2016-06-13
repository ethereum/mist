module.exports = function(windowId) {
  // for tests to work (see https://github.com/electron/spectron#node-integration)
  window.electronRequire = require;

  require('./consoleLogCapture')(windowId);
}
