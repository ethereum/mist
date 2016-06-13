require('co-mocha');

const Q = require('bluebird');
const shell = require('shelljs');
const path = require('path');
const buildHelpers = require('../buildHelpers');
const gethPrivate = require('geth-private');
const Application = require('spectron').Application;

const chai = require('chai');
chai.should();


exports.mocha = function(_module, options) {
  const tests = {};

  _module.exports[options.name || path.basename(_module.filename)] = {
    before: function*() {
      this.assert = chai.assert;
      this.expect = chai.expect;

      const logFilePath = path.join(__dirname, 'mist.log');
      shell.rm('-rf', logFilePath);

      const appNameVersion = buildHelpers.buildDistPkgName('darwin', 'wallet', {
        replaceOs: true,
        includeVersion: true,
      });
      const execName = buildHelpers.buildAppExecName('wallet');

      const appPath = 
        path.join(buildHelpers.buildDistPath('wallet', appNameVersion), execName + '.app', 'Contents', 'MacOS', execName);

      console.log(appPath);

      this.geth = gethPrivate({
        balance: 5,
        genesisBlock: {
          difficulty: '0x1',
          extraData: '0x1',
        },
      });

      yield this.geth.start();

      this.app = new Application({
        path: appPath,
        args: ['--mode', options.app, '--loglevel', 'debug', '--logfile', logFilePath, '--node-datadir', this.geth.dataDir],
      });

      yield this.app.start();

      yield Q.delay(5000);
    },

    after: function*() {
      if (this.app && this.app.isRunning()) {
        yield this.app.stop();
      }

      if (this.geth && this.geth.isRunning) {
        yield this.geth.stop();
      }
    },

    tests: tests,
  };

  return tests;
};

