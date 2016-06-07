require('co-mocha');

const path = require('path');
const buildHelpers = require('../buildHelpers');
const Application = require('spectron').Application;

const chai = require('chai');
chai.should();


exports.mocha = function(_module, options) {
  const tests = {};

  _module.exports[options.name || path.basename(_module.filename)] = {
    before: function*() {
      this.assert = chai.assert;
      this.expect = chai.expect;

      const appNameVersion = buildHelpers.buildDistPkgName('darwin', options.app, {
        replaceOs: true,
        includeVersion: true,
      });
      const execName = buildHelpers.buildAppExecName(options.app);

      const appPath = 
        path.join(buildHelpers.buildDistPath(options.app, appNameVersion), execName + '.app', 'Contents', 'MacOS', execName);

      console.log(appPath);

      this.app = new Application({
        path: appPath,
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

