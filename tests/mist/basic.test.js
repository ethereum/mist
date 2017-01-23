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

    yield client.setValue('#url-input', 'http://localhost:8080/page1/page2?param=value#hash');
    yield client.submitForm('form.url');

    yield client.waitUntil(() => {
        return client.getText('.url-breadcrumb').then((e) => {
            return e === 'http://localhost:8080 ▸ page1 ▸ page2';
        });
    }, 2000, 'expected breadcrumb to render as HTML encoded');

    (yield client.getText('.url-breadcrumb')).should.eql('http://localhost:8080 ▸ page1 ▸ page2');
};

test['Browser bar should not render script tags on breadcrumb view'] = function* () { // ETH-01-001
    const client = this.client;

    yield client.setValue('#url-input', '<script>alert()</script>');
    yield client.submitForm('form.url');

    yield client.waitUntil(() => {
        return client.getText('.url-breadcrumb').then((e) => {
            return /404\.html$/.test(e);
        });
    }, 2000, 'expected breadcrumb to render as HTML encoded');

    should.exist(yield this.getUiElement('form.url'));
    should.not.exist(yield this.getUiElement('form.url script'));
};

test['Browser bar should not render script tags in disguise on breadcrumb view'] = function* () { // ETH-01-001
    const client = this.client;

    yield client.setValue('#url-input', '&lt;script&gt;alert()&lt;/script&gt;');
    yield client.submitForm('form.url');

    const isUrlBlocked = (yield client.execute(() => { // Code executed in context of browser
        try { $('form.url').submit(); }
        catch(e) { return /Invalid URL/.test(e); }
        return false;
    })).value;

    isUrlBlocked.should.be.true;
    should.not.exist(yield this.getUiElement('form.url script'));
};

test['Browser bar should not render script tags in disguise (2) on breadcrumb view'] = function* () { // ETH-01-001
    const client = this.client;

    yield client.setValue('#url-input', '<svg><script>alert()</script></svg>');
    yield client.submitForm('form.url');

    yield client.waitUntil(() => {
        return client.getText('.url-breadcrumb').then((e) => {
            return /404\.html$/.test(e);
        });
    }, 2000, 'expected breadcrumb to render as HTML encoded');

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
    }, 2000, 'expected breadcrumb to render as HTML encoded');
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
};

test['Load fixture page'] = function* () {
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
    isProtocolBlocked.should.be.false;

    yield client.waitUntil(() => {
        return client.getText('.url-breadcrumb').then((e) => {
            return e === 'http://localhost:8080 ▸ index.html';
        });
    }, 2000, 'expected breadcrumb to render as HTML encoded');

    const browserBarText = yield this.client.getText('.url-breadcrumb');
    browserBarText.should.eql('http://localhost:8080 ▸ index.html'); // checks that did change displayed URL
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

    yield Q.delay(500);
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

    yield Q.delay(500);
    const browserBarText = yield this.getBrowserBarText();
    browserBarText.should.eql('http://localhost:8080'); // checks that hasn't changed displayed URL
};

test['Check disallowed "file:///" protocol'] = function* () { // ETH-01-002
    const client = this.client;
    yield this.loadFixture();
    yield client.setValue('#url-input', path.join(__dirname, '..', 'fixtures', 'index.html'));

    const isProtocolBlocked = (yield client.execute(() => { // Code executed in context of browser
        try { $('form.url').submit(); }
        catch(e) { return /Invalid URL/.test(e); }
        return false;
    })).value;
    isProtocolBlocked.should.be.false;

    yield Q.delay(500);
    const browserBarText = yield this.getBrowserBarText();
    browserBarText.should.eql('file://  ▸ '); // checks that hasn't changed displayed URL
};

// TODO: test LocalStore.set when selecting tabs

test['Pin tab test'] = function* () { // ETH-01-007
    const client = this.client;

    const sidebarItems = (yield client.elements('.sidebar nav > ul > li')).value;

    yield this.selectTab('browser');

    yield this.openAndFocusNewWindow(() => {
        return client.click('span.connect-button');
    });
    yield client.click('.dapp-primary-button');
    yield client.window(this.mainWindowHandle); // select main window again

    yield Q.delay(500);
    const sidebarItemsAfterAdd = (yield client.elements('.sidebar nav > ul > li')).value;

    sidebarItems.length.should.eql(2);
    sidebarItemsAfterAdd.length.should.eql(3);
};



