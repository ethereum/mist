"use strict";

const Q = require('bluebird'),
  fs = require('fs'),
  path = require('path');


const test = require('../_base').mocha(module, {
  app: 'wallet'
});


test.beforeEach = function*() {
  if (!this.app.webContents) {
    throw new Error('Unable to get active window');
  }
};


test['title'] = function*() {
  console.log(yield this.app.browserWindow.getTitle());
  console.log(yield this.app.browserWindow.getId());
  console.log(yield this.app.browserWindow.getURL());
};


