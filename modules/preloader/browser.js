/**
@module preloader browser
*/
require('./include/common')('browser');
const { ipcRenderer: ipc, shell } = require('electron');
const mist = require('../mistAPI.js');
const BigNumber = require('bignumber.js');
const ipcProviderWrapper = require('../ipc/ipcProviderWrapper.js');
const Web3 = require('web3');
require('./include/getFavicon.js');
require('./include/getMetaTags.js');
require('./include/openExternal.js');
require('./include/setBasePath')('interface');

// notifiy the tab to store the webview id
ipc.sendToHost('setWebviewId');

// destroy the old socket
ipc.send('ipcProvider-destroy');


window.mist = mist();
window.BigNumber = BigNumber;
window.web3 = new Web3(new Web3.providers.IpcProvider('', ipcProviderWrapper));

// prevent overwriting the Dapps Web3
delete global.Web3;
delete window.Web3;
