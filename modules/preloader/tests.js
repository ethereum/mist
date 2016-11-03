/**
@module preloader tests
*/

if(location.origin !== "file://") {
    throw new Error('Wrong test file loaded');
    return;
}


// load dapp preloader file
require('./dapps.js');


const electron = require('electron');
const ipc = electron.ipcRenderer;

window.ipcProvider = require('../ipc/ipcProviderWrapper.js');
window.permissions = {};

ipc.sendToHost('sendTestData');
ipc.on('sendTestData', function(e, data) {
    window.permissions = data.permissions;
})
