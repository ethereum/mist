module.exports = function(windowId) {
  if ('true' === process.env.TEST_MODE) {
    window.electronRequire = require;
  }

  require('./consoleLogCapture')(windowId);
}
