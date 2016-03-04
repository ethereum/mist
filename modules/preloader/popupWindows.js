/**
@module preloader PopupWindows
*/

const ipc = require('electron').ipcRenderer;
require('../openExternal.js');
const mist = require('../mistAPI.js');
const ipcProviderWrapper = require('../ipc/ipcProviderWrapper.js');
const BigNumber = require('bignumber.js');
const Web3 = require('web3');
const web3Admin = require('../web3Admin.js');

// disable pinch zoom
require('web-frame').setZoomLevelLimits(1, 1);

// receive data in the popupWindow
ipc.on('data', function(e, data) {
    Session.set('data', data);
})


// make variables globally accessable
window.mist = mist();
window.BigNumber = BigNumber;
window.web3 = new Web3(new Web3.providers.IpcProvider('', ipcProviderWrapper));
web3Admin.extend(window.web3);

window.dirname = __dirname;
window.ipc = ipc;
window.platform = process.platform;
    

