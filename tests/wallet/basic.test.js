const _ = require('underscore');
const Q = require('bluebird');
const fs = require('fs');
const path = require('path');


const test = require('../_base').mocha(module, {
    app: 'wallet',
});


test.title = function* () {
    yield this.client.window(this.mainWindowHandle);

    (yield this.client.getTitle()).should.eql('Ethereum Wallet');
};


test['account balances'] = function* () {
    const web3 = this.web3;
    const client = this.client;

    const realBalances = this.getRealAccountBalances();
    const appBalances = this.getUiAccountBalances();

    appBalances.should.eql(realBalances);
};


// test['create account'] = function*() {
//   const web3 = this.web3;
//   const client = this.client;

//   const originalBalances = yield this.getRealAccountBalances();

//   yield _createNewAccount.call(this);

//   const realBalances = yield this.getRealAccountBalances();
//   const appBalances = yield this.getUiAccountBalances();

//   _.keys(realBalances).length.should.eql(_.keys(originalBalances).length + 1);
//   appBalances.should.eql(realBalances);
// };


test['deposit into account'] = function* () {
    const web3 = this.web3;
    const client = this.client;

    const accounts = web3.eth.accounts;

    yield _createNewAccount.call(this);

    const newAccount = _.difference(web3.eth.accounts, accounts)[0];

    yield this.openAccountInUi(newAccount);

  // links
    const accLinks = yield this.getUiElements('.dapp-actionbar li');
    yield client.elementIdClick(accLinks[0].ELEMENT);

  // fill in send form and submit
    yield _completeSendForm.call(this, 1);

  // do some mining
    yield this.startMining();
    yield Q.delay(10000);
    yield this.stopMining();

  // check balances
    const realBalances = yield this.getRealAccountBalances();

    realBalances[newAccount].should.eql(1);
};


const _createNewAccount = function* () {
    const client = this.client;

  // open password window
    yield this.openAndFocusNewWindow(() => {
        return client.click('button.create.account');
    });

  // enter password
    yield client.setValue('form .password', '1234');
    yield client.click('form button.ok');

  // re-enter password
    yield client.setValue('form .password-repeat', '1234');
    yield client.click('form button.ok');

    yield Q.delay(10000);

    yield client.window(this.mainWindowHandle);
};


const _completeSendForm = function* (amt) {
    const client = this.client;

  // enter password
    yield client.setValue('form input[name=amount]', `${amt}`);

  // open password window
    yield this.openAndFocusNewWindow(() => {
        return client.click('form button[type=submit]');
    });

  // fill in password and submit
    yield client.setValue('form input[type=password]', '1234');
    yield client.click('form button.ok');

    yield Q.delay(5000);
};
