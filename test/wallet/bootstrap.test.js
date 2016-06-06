"use strict";

const tests = require('../_base').mocha(module, {
  app: 'wallet'
});


tests['it opens a window'] = function*() {
  const win = this.app.browserWindow;

  (yield this.app.client.getWindowCount()).should.eql(1);
};
