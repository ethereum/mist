/**
@module preloader PopupWindows
*/

const ipc = require('electron').ipcRenderer;
const ipcProviderWrapper = require('../ipc/ipcProviderWrapper.js');

// disable pinch zoom
require('web-frame').setZoomLevelLimits(1, 1);

// receive data in the popupWindow
ipc.on('data', function(e, data) {
    Session.set('data', data);
})

window.dirname = __dirname;
window.ipc = ipc;
window.platform = process.platform;

