/**
@module preloader PopupWindows
*/

require('./include/common')('popup');
const electron = require('electron');
const ipc = electron.ipcRenderer;
require('../openExternal.js');
const mist = require('../mistAPI.js');
const syncMinimongo = require('../syncMinimongo.js');
const ipcProviderWrapper = require('../ipc/ipcProviderWrapper.js');
const BigNumber = require('bignumber.js');
const Q = require('bluebird');
const https = require('https');
const Web3 = require('web3');
const web3Admin = require('../web3Admin.js');

require('./include/setBasePath')('interface');

// register with window manager
ipc.send('backendAction_setWindowId');

// disable pinch zoom
electron.webFrame.setZoomLevelLimits(1, 1);

// receive data in the popupWindow
ipc.on('data', function(e, data) {
    Session.set('data', data);
})


// make variables globally accessable
window.mist = mist();
window.syncMinimongo = syncMinimongo;
window.BigNumber = BigNumber;
window.Q = Q;
window.web3 = new Web3(new Web3.providers.IpcProvider('', ipcProviderWrapper));
web3Admin.extend(window.web3);

window.ipc = ipc;
window.https = https;
