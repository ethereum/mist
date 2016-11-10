/**
@module preloader PopupWindows
*/

require('./include/common')('popup');
const { ipcRenderer: ipc, remote, webFrame } = require('electron');
const mist = require('../mistAPI.js');
const ipcProviderWrapper = require('../ipc/ipcProviderWrapper.js');
const BigNumber = require('bignumber.js');
const Q = require('bluebird');
const Web3 = require('web3');
const web3Admin = require('../web3Admin.js');
const syncDb = require('../syncDb.js');
const https = require('https');

require('./include/openExternal.js');
require('./include/setBasePath')('interface');


// disable pinch zoom
webFrame.setZoomLevelLimits(1, 1);

// receive data in the popupWindow
ipc.on('data', (e, data) => {
    Session.set('data', data);
});


// make variables globally accessable
window.mist = mist();
window.dirname = remote.getGlobal('dirname');
window.BigNumber = BigNumber;
window.Q = Q;
window.web3 = new Web3(new Web3.providers.IpcProvider('', ipcProviderWrapper));
web3Admin.extend(window.web3);

window.syncDb = syncDb;
window.ipc = ipc;
window.https = https;
