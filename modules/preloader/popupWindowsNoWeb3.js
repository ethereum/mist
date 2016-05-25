/**
@module preloader PopupWindows
*/

require('./consoleLogCapture')('popup-no-web3');
const electron = require('electron');
const mist = require('../mistAPI.js');
const ipc = electron.ipcRenderer;
const ipcProviderWrapper = require('../ipc/ipcProviderWrapper.js');

require('./setBasePath')('interface');

// disable pinch zoom
electron.webFrame.setZoomLevelLimits(1, 1);

// receive data in the popupWindow
ipc.on('data', function(e, data) {
    Session.set('data', data);
})

window.ipc = ipc;
window.mist = mist();
