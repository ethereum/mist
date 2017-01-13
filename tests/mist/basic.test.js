const _ = require('underscore');
const Q = require('bluebird');
const fs = require('fs');
const path = require('path');


const test = require('../_base').mocha(module, {
    app: 'mist',
});


test['Sanity Check: main window'] = function* () {
    const client = this.client;

    const windowHandles = (yield client.windowHandles()).value;

    // for (let e in windowHandles) {
    //     yield client.window(windowHandles[e]);
    //     let windowUrl = yield client.getUrl();
    //     console.log('Window URL', windowHandles[e], windowUrl);
    // }

    yield client.window(this.mainWindowHandle);
    console.log('mainWindowHandle', this.mainWindowHandle);

    (yield client.getUrl()).should.eql('file:///Users/ev/Projects/Ethereum/officialMist/dist_mist/dist/mac/Mist.app/Contents/Resources/app.asar/interface/index.html');
};


test['Browser bar should not render scripts'] = function* () {
    const client = this.client;
    yield client.window(this.mainWindowHandle);

    yield client.setValue('#url-input', '<script>alert()</script>');
    yield client.submitForm('form.url');

    const urlBarText = yield client.getText('.url-breadcrumb');
    urlBarText.should.eql('%3Cscript%3Ealert%28%29%3C ▸ script%3E');
};

test['Browser bar should not render arbitrary code as HTML'] = function* () {
    const client = this.client;
    yield client.window(this.mainWindowHandle);

    yield client.setValue('#url-input', '<iframe onload="alert(ipc)">');
    yield client.submitForm('form.url');

    const urlBarText = yield client.getText('.url-breadcrumb');
    urlBarText.should.eql('%3Ciframe onload="alert%28%29%"%3E');
    client.saveScreenshot('./snapshot.png');
};

test['menu item'] = function* () {
    const client = this.client;
    console.log('elements', yield this.getUiElements('li'));
    console.log('title', yield client.getTitle());
    console.log('', yield client.element('li').getText());
    // console.log('', yield client.());
};

const _selectMainWindow = function* () {
    yield client.window(this.mainWindowHandle);
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
