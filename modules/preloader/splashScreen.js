require('./include/common')('splash');
const mist = require('../mistAPI.js');
const { ipcRenderer: ipc, remote, webFrame } = require('electron');
const ipcProviderWrapper = require('../ipc/ipcProviderWrapper.js');
const Web3 = require('web3');

require('./include/openExternal.js');
require('./include/setBasePath')('interface');


// get and set language
ipc.send('backendAction_setLanguage', navigator.language);

// disable pinch zoom
webFrame.setZoomLevelLimits(1, 1);

window.ipc = ipc;
window.mist = mist();
window.dirname = remote.getGlobal('dirname');
window.web3 = new Web3(new Web3.providers.IpcProvider('', ipcProviderWrapper));
