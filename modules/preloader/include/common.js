module.exports = function(windowId) {
  if (process.env.TEST_MODE) {
    window.electronRequire = require;
  }

  require('./consoleLogCapture')(windowId);
}
