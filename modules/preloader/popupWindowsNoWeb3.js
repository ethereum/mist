/**
@module preloader PopupWindows
*/

require('./console-log-capture')('popup-no-web3');
const electron = require('electron');
const ipc = electron.ipcRenderer;
const ipcProviderWrapper = require('../ipc/ipcProviderWrapper.js');
const basePath = require('../setBasePath.js');

basePath('interface');

// disable pinch zoom
electron.webFrame.setZoomLevelLimits(1, 1);

// receive data in the popupWindow
ipc.on('data', function(e, data) {
    Session.set('data', data);
})

window.dirname = __dirname;
window.ipc = ipc;
window.platform = process.platform;

