require('co-mocha');

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
        args: ['--mode', options.app, '--', '--datadir', this.geth.dataDir],
      });

      yield this.app.start();

      yield this.app.client.waitUntilWindowLoaded();
    },

    after: function*() {
      if (this.app && this.app.isRunning()) {
        yield this.app.stop();
      }

      yield this.geth.stop();
    },

    tests: tests,
  };

  return tests;
};

