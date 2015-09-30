/**
@module preloader PopupWindows
*/

const ipc = require('ipc');
const web3 = require('web3');
const ipcProviderWrapper = require('../ipc/ipcProviderWrapper.js');

const web3Admin = require('../web3Admin.js');
web3Admin.extend(web3);

// set web3 providor
web3.setProvider(new web3.providers.IpcProvider('', ipcProviderWrapper));

// receive data in the popupWindiw
ipc.on('data', function(data) {
    Session.set('data', data);
})

// make variables globally accessable
window.dirname = __dirname;
window.web3 = web3;
window.ipc = ipc;
window.platform = process.platform;

