"use strict";

const Q = require('bluebird');


const test = require('../_base').mocha(module, {
  app: 'wallet'
});


test.beforeEach = function*() {
  if (!this.app.webContents) {
    throw new Error('Unable to get active window');
  }
};


test['url'] = function*() {
  yield Q.delay(10000);

  console.log(this.app.webContents.getId(), this.app.webContents.getURL(), this.app.webContents.getTitle());
};


