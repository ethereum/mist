const Windows = require('./windows');

class BlurOverlay {
  static enable() {
    BlurOverlay.setBlurOverlay(true);
  }

  static disable() {
    BlurOverlay.setBlurOverlay(false);
  }

  static setBlurOverlay(flag) {
    const mainWindow = Windows.getByType('main');
    mainWindow.send('uiAction_enableBlurOverlay', flag);
  }
}

module.exports = BlurOverlay;
