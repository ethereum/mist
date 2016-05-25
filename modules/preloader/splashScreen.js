require('./consoleLogCapture')('splash');
const mist = require('../mistAPI.js');
const electron = require('electron');
const ipc = electron.ipcRenderer;
const ipcProviderWrapper = require('../ipc/ipcProviderWrapper.js');
const Web3 = require('web3');
require('../openExternal.js');

require('./setBasePath')('interface');

// get and set language
ipc.send('backendAction_setLanguage', navigator.language);

// disable pinch zoom
electron.webFrame.setZoomLevelLimits(1, 1);

window.ipc = ipc;
window.mist = mist();
window.web3 = new Web3(new Web3.providers.IpcProvider('', ipcProviderWrapper));
