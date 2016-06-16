"use strict";

require('co-mocha');

const Q = require('bluebird');
const fs = require('fs');
const shell = require('shelljs');
const path = require('path');
const buildHelpers = require('../buildHelpers');
const gethPrivate = require('geth-private');
const Application = require('spectron').Application;

const chai = require('chai');
chai.should();

process.env.NODE_ENV = 'test';


exports.mocha = function(_module, options) {
  const tests = {};

  _module.exports[options.name || path.basename(_module.filename)] = {
    before: function*() {
      this.assert = chai.assert;
      this.expect = chai.expect;

      this.geth = gethPrivate({
        balance: 5,
        genesisBlock: {
          difficulty: '0x1',
          extraData: '0x1',
        },
      });

      yield this.geth.start();

      const logFilePath = path.join(__dirname, 'mist.log');
      shell.rm('-rf', logFilePath);

      const appNameVersion = buildHelpers.buildDistPkgName('darwin', 'wallet', {
        replaceOs: true,
        includeVersion: true,
      });
      const execName = buildHelpers.buildAppExecName('wallet');

      const appPath = 
        path.join(buildHelpers.buildDistPath('wallet', appNameVersion), execName + '.app', 'Contents', 'MacOS', execName);

      // console.log(appPath);

      this.app = new Application({
        requireName: 'require',
        startTimeout: 5000,
        waitTimeout: 5000,
        quitTimeout: 10000,
        path: appPath,
        args: [
          '--mode', options.app, 
          '--loglevel', 'debug', 
          '--logfile', logFilePath, 
          '--node-datadir', this.geth.dataDir,
          '--ipcpath', path.join(this.geth.dataDir, 'geth.ipc')
        ],
      });

      yield this.app.start();

      yield this.app.client.waitUntilWindowLoaded();

      yield Q.delay(10000);

      console.log(this.app.chromeDriver.logLines);

      let windowTitle = yield this.app.client.executeAsync(function(done) {
        done();
      });

      console.log('title', '[' + windowTitle + ']');

      let pageImage = yield this.app.browserWindow.capturePage();

      if (!pageImage) {
        throw new Error('Page capture failed');
      }

      fs.writeFileSync(path.join(__dirname, 'mist.png'), pageImage);
    },

    after: function*() {
      // QUITTING APP DOES NOT WORK
      // if (this.app && this.app.isRunning()) {
      //   yield this.app.stop();
      // }

      if (this.geth && this.geth.isRunning) {
        yield this.geth.stop();
      }
    },

    tests: tests,
  };

  return tests;
};

