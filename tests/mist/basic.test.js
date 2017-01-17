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

    yield this.loadFixture();
};

test['Check allowed "http://" protocol'] = function* () { // ETH-01-002
    const client = this.client;
    yield this.loadFixture();
    yield client.setValue('#url-input', `${this.fixtureBaseUrl}index.html`);

    const isProtocolBlocked = (yield client.execute(() => { // Code executed in context of browser
        try { $('form.url').submit(); }
        catch(e) { return /Invalid URL/.test(e); }
        return false;
    })).value;
    console.log('isProtocolBlocked', isProtocolBlocked);

    isProtocolBlocked.should.be.false;

    const browserBarText = yield this.getBrowserBarText();
    yield Q.delay(1000);
    console.log('browserBarText', browserBarText);
    browserBarText.should.eql(`http://localhost:8080 ▸ index.html`); // checks that did change displayed URL
};

test['Check disallowed "javascript:" protocol'] = function* () { // ETH-01-002
    const client = this.client;
    yield this.loadFixture();
    yield client.setValue('#url-input', 'javascript:window.close()');

    const isProtocolBlocked = (yield client.execute(() => { // Code executed in context of browser
        try { $('form.url').submit(); }
        catch(e) { return /Invalid URL/.test(e); }
        return false;
    })).value;
    isProtocolBlocked.should.be.true;

    const browserBarText = yield this.getBrowserBarText();
    browserBarText.should.eql('http://localhost:8080'); // checks that hasn't changed displayed URL
};

test['Check disallowed "data:" protocol'] = function* () { // ETH-01-002
    const client = this.client;
    yield this.loadFixture();
    yield client.setValue('#url-input', 'data:text/plain;charset=utf-8;base64,dGhpcyB0ZXN0IGlzIG9uIGZpcmU=');

    const isProtocolBlocked = (yield client.execute(() => { // Code executed in context of browser
        try { $('form.url').submit(); }
        catch(e) { return /Invalid URL/.test(e); }
        return false;
    })).value;
    isProtocolBlocked.should.be.true;

    const browserBarText = yield this.getBrowserBarText();
    browserBarText.should.eql('http://localhost:8080'); // checks that hasn't changed displayed URL
};



