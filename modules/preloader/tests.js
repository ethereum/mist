if(location.origin !== "file://") {
    throw new Error('Wrong test file loaded');
    return;
}


// load mist API
require('./mistAPI.js');
const ipc = require('ipc');

window.permissions = {};

ipc.sendToHost('sendTestData');
ipc.on('sendTestData', function(data) {
    window.permissions = data.permissions;
})
