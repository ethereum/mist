require('./include/common')('splashscreen');
const mist = require('./include/mistAPI.js');
const { ipcRenderer, remote, webFrame } = require('electron');
const ipcProviderWrapper = require('../ipc/ipcProviderWrapper.js');
const Web3 = require('web3');

require('./include/openExternal.js');
require('./include/setBasePath')('interface');


// get and set language
ipcRenderer.send('backendAction_setLanguage', navigator.language);

// disable pinch zoom
webFrame.setZoomLevelLimits(1, 1);

window.ipc = ipcRenderer;
window.mist = mist();
window.mistMode = remote.getGlobal('mode');
window.dirname = remote.getGlobal('dirname');
window.web3 = new Web3(new Web3.providers.IpcProvider('', ipcProviderWrapper));
