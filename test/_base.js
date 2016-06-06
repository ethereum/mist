require('co-mocha');

const path = require('path');

const Application = require('spectron').Application;

const chai = require('chai');
chai.should();


exports.mocha = function(_module, options) {
  const tests = {};

  _module.exports[options.name || path.basename(_module.filename)] = {
    before: function*() {
      this.assert = chai.assert;
      this.expect = chai.expect;

      const appPath = ('wallet' === options.app)
        ? path.join(__dirname, '..', 'dist_wallet')
        : path.join(__dirname, '..', 'dist_mist');

      this.app = new Application({
        path: path.join(),
      });

      yield this.app.start();

      yield this.app.client.waitUntilWindowLoaded();
    },

    after: function*() {
      if (this.app && this.app.isRunning()) {
        yield this.app.stop();
      }
    },

    tests: tests,
  };

  return tests;
};

