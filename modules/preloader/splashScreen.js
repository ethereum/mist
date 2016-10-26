require('./include/common')('splash');
const mist = require('../mistAPI.js');
const electron = require('electron');
const remote = electron.remote;
const ipc = electron.ipcRenderer;
const ipcProviderWrapper = require('../ipc/ipcProviderWrapper.js');
const Web3 = require('web3');
require('../openExternal.js');

require('./include/setBasePath')('interface');

// register with window manager
ipc.send('backendAction_setWindowId');

// get and set language
ipc.send('backendAction_setLanguage', navigator.language);

// disable pinch zoom
electron.webFrame.setZoomLevelLimits(1, 1);

window.ipc = ipc;
window.mist = mist();
window.dirname = remote.getGlobal('dirname');
window.web3 = new Web3(new Web3.providers.IpcProvider('', ipcProviderWrapper));
