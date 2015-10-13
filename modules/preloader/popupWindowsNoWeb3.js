/**
@module preloader PopupWindows
*/

const ipc = require('ipc');
const ipcProviderWrapper = require('../ipc/ipcProviderWrapper.js');

// receive data in the popupWindow
ipc.on('data', function(data) {
    Session.set('data', data);
})

window.dirname = __dirname;
window.ipc = ipc;
window.platform = process.platform;

