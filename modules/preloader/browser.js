/**
@module preloader browser
*/
require('./console-log-capture')('browser');
const electron = require('electron');
const ipc = electron.ipcRenderer;
const mist = require('../mistAPI.js');
require('../openExternal.js');
const shell = electron.shell;
const BigNumber = require('bignumber.js');
const ipcProviderWrapper = require('../ipc/ipcProviderWrapper.js');
var Web3 = require('web3');
const basePath = require('./setBasePath.js');
require('../getFavicon.js');
require('../getMetaTags.js');
require('../openExternal.js');

basePath('interface');

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