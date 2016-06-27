"use strict";

const _ = require('underscore');

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
  (yield this.app.browserWindow.getTitle()).should.eql('Ethereum Wallet');
};



test['account balances'] = function*() {
  const web3 = this.web3;
  const client = this.client;

  let accounts = web3.eth.accounts;

  accounts.length.should.be.gt(0);

  let balances = accounts.map((acc) => 
    web3.fromWei(web3.eth.getBalance(acc), 'ether') + ''
  );

  accounts = accounts.map(a => a.toLowerCase());
  balances = balances.map(b => parseInt(b));

  const realBalances = _.object(accounts, balances);

  // check balances on the page
  let _accounts = yield this.execElemMethod('elementIdText', '.wallet-box .account-id');
  _accounts.length.should.be.gt(0);

  let _balances = yield this.execElemMethod('elementIdText', '.wallet-box .account-balance');

  _accounts = _accounts.map(a => a.toLowerCase());
  _balances = _balances.map(b => parseInt(b));

  const appBalances = _.object(_accounts, _balances);

  appBalances.should.eql(realBalances);
};


test['create account'] = function*() {
  const web3 = this.web3;
  const client = this.client;

  const existingHandles = yield client.windowHandles();

  yield client.click('button.create.account');
  
  yield client.waitUntil(function checkForAddWindow() {
    return client.windowHandles().then((handles) => {
      return handles.length === existingHandles.length + 1;
    });
  }, 10000, 'expected new passwd entry window to be visible', 500);

  const newHandles = yield client.windowHandles();

  // focus on new window
  yield client.window(newHandles.pop());

  


};


