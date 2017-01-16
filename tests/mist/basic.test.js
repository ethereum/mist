const _ = require('underscore');
const Q = require('bluebird');
const fs = require('fs');
const path = require('path');
const should = require('chai').should();

const test = require('../_base').mocha(module, {
    app: 'mist',
});

test['Check for Mist title'] = function* () {
    (yield this.client.getTitle()).should.eql('Mist');
};

test['Sanity Check: main window is focused'] = function* () {
    const client = this.client;

    (yield client.getUrl()).should.match(/interface\/index\.html$/);
};

test['Browser bar should render urls with separators'] = function* () {
    const client = this.client;

    yield client.setValue('#url-input', 'http://example.com/page1/page2?param=value#hash');
    yield client.submitForm('form.url');

    yield client.waitUntil(() => {
        return client.getText('.url-breadcrumb').then((e) => {
            console.log('e', e);

            return e === 'http://example.com ▸ page1 ▸ page2';
        });
    }, 5000, 'expected breadcrumb to render as HTML encoded');
};

test['Browser bar should not render script tags on breadcrumb view'] = function* () { // ETH-01-001
    const client = this.client;

    yield client.setValue('#url-input', '<script>alert()</script>');
    yield client.submitForm('form.url');

    yield client.waitUntil(() => {
        return client.getText('.url-breadcrumb').then((e) => {
            console.log('e', e);

            // HTML encoded version of input
            return e === '%3Cscript%3Ealert%28%29%3C ▸ script%3E';
        });
    }, 5000, 'expected breadcrumb to render as HTML encoded');

    should.exist(yield this.getUiElement('form.url'));
    should.not.exist(yield this.getUiElement('form.url script'));
};

test['Browser bar should not render script tags in disguise on breadcrumb view'] = function* () { // ETH-01-001
    const client = this.client;

    yield client.setValue('#url-input', '&lt;script&gt;alert()&lt;/script&gt;');
    yield client.submitForm('form.url');

    yield client.waitUntil(() => {
        return client.getText('.url-breadcrumb').then((e) => {
            console.log('e', e);
            return e === '%3Cscript%3Ealert%28%29%3C ▸ script%3E';
        });
    }, 5000, 'expected breadcrumb to render as HTML encoded');

    should.not.exist(yield this.getUiElement('form.url script'));
};

test['Browser bar should not render script tags in disguise (2) on breadcrumb view'] = function* () { // ETH-01-001
    const client = this.client;

    yield client.setValue('#url-input', '<svg><script>alert()</script></svg>');
    yield client.submitForm('form.url');

    yield client.waitUntil(() => {
        return client.getText('.url-breadcrumb').then((e) => {
            console.log('e', e);

            return e === '%3Csvg%3E%3Cscript%3Ealert%28%29%3C ▸ script%3E%3C ▸ svg%3E';
        });
    }, 5000, 'expected breadcrumb to render as HTML encoded');

    should.exist(yield this.getUiElement('form.url'));
    should.not.exist(yield this.getUiElement('form.url svg'));
    should.not.exist(yield this.getUiElement('form.url script'));
};

test['Browser bar should not render arbitrary code as HTML'] = function* () { // ETH-01-001
    const client = this.client;

    yield client.setValue('#url-input', '<iframe onload="alert(ipc)">');
    yield client.submitForm('form.url');

    yield client.waitUntil(() => {
        return client.getText('.url-breadcrumb', (e) => {
            return e === '%3Ciframe onload="alert%28%29%"%3E';
        });
    }, 5000, 'expected breadcrumb to render as HTML encoded');
};

test['Browser bar should not execute JS'] = function* () { // ETH-01-001
    const client = this.client;

    yield client.setValue('#url-input', '<script>window.pwned = true</script>');
    yield client.submitForm('form.url');

    const mist = yield client.execute(() => { return window.mist }); // checking if `execute` works
    const pwned = yield client.execute(() => { return window.pwned });

    should.exist(mist.value);
    should.not.exist(pwned.value);
};

test['Should select Wallet and Browse tabs properly'] = function* () {
    const client = this.client;

    const walletTab = yield this.selectTab('wallet');
    // walletTab.getAttribute('')
};

test['Check disallowed protocols'] = function* () {
    const client = this.client;

    yield client.setValue('#url-input', 'javascript:window.close()');
    yield client.submitForm('form.url');
    yield Q.delay(1000);
};
