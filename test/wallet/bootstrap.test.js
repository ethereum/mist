"use strict";

const test = require('../_base').mocha(module, {
  app: 'wallet'
});


test.beforeEach = function*() {
  if (!this.app.webContents) {
    throw new Error('Unable to get active window');
  }
};


test['url'] = function*() {
  console.log(this.app.webContents.getURL());
};


