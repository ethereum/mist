require('./console-log-capture')('splash');
const electron = require('electron');
const ipc = electron.ipcRenderer;
const basePath = require('../setBasePath.js');
const ipcProviderWrapper = require('../ipc/ipcProviderWrapper.js');
const Web3 = require('web3');
require('../openExternal.js');

basePath('interface');

// get and set language
ipc.send('backendAction_setLanguage', navigator.language);

// disable pinch zoom
electron.webFrame.setZoomLevelLimits(1, 1);

window.ipc = ipc;
window.mode = location.hash.replace('#splashScreen_','');
window.dirname = __dirname.replace('modules/preloader','').replace('modules\\preloader','');

window.web3 = new Web3(new Web3.providers.IpcProvider('', ipcProviderWrapper));
