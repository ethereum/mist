const _ = require('underscore');
const Q = require('bluebird');
const fs = require('fs');
const path = require('path');


const test = require('../_base').mocha(module, {
    app: 'mist',
});

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
