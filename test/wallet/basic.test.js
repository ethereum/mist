"use strict";

const _ = require('underscore');

const Q = require('bluebird'),
  fs = require('fs'),
  path = require('path');


const test = require('../_base').mocha(module, {
  app: 'wallet'
});




test['title'] = function*() {
  yield this.client.window(this.mainWindowHandle);

  (yield this.client.getTitle()).should.eql('Ethereum Wallet');
};



test['account balances'] = function*() {
  const web3 = this.web3;
  const client = this.client;

  const realBalances = this.getRealAccountBalances();
  const appBalances = this.getUiAccountBalances();

  appBalances.should.eql(realBalances);
};


test['create account'] = function*() {
  const web3 = this.web3;
  const client = this.client;

  const originalBalances = yield this.getRealAccountBalances();

  const existingHandles = (yield client.windowHandles()).value;

  yield client.click('button.create.account');
  
  yield this.waitUntil('new passwd window visible', function checkForAddWindow() {
    return client.windowHandles().then((handles) => {
      return handles.value.length === existingHandles.length + 1;
    });
  });

  const newHandles = (yield client.windowHandles()).value;

  // focus on new window
  yield client.window(newHandles.pop());

  // enter password
  yield client.setValue('form .password', '1234');
  yield client.click('form button.ok');

  // re-enter password
  yield client.setValue('form .password-repeat', '1234');
  yield client.click('form button.ok');

  yield Q.delay(10000);

  /*
  Check that new account got created
   */

  yield client.window(this.mainWindowHandle);

  const realBalances = yield this.getRealAccountBalances();
  const appBalances = yield this.getUiAccountBalances();

  _.keys(realBalances).length.should.eql(_.keys(originalBalances).length + 1);
  appBalances.should.eql(realBalances);
};

