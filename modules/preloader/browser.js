/**
@module preloader browser
*/
require('./include/common')('browser');
const { ipcRenderer } = require('electron');
const mist = require('./include/mistAPI.js');
const BigNumber = require('bignumber.js');
const ipcProviderWrapper = require('../ipc/ipcProviderWrapper.js');
const Web3 = require('web3');
require('./include/getFavicon.js');
require('./include/getMetaTags.js');
require('./include/setBasePath')('interface');

// notifiy the tab to store the webview id
ipcRenderer.sendToHost('setWebviewId');

// destroy the old socket
ipcRenderer.send('ipcProvider-destroy');

// Security
process.on('loaded',function () {
    Object.freeze(window.JSON);
    // Object.freeze(window.Function);
    // Object.freeze(window.Function.prototype);
    // Object.freeze(window.Array);
    // Object.freeze(window.Array.prototype);
});


window.mist = mist();
window.BigNumber = BigNumber;
window.web3 = new Web3(new Web3.providers.IpcProvider('', ipcProviderWrapper));

// prevent overwriting the Dapps Web3
delete global.Web3;
delete window.Web3;
