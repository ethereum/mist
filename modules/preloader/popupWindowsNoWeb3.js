/**
@module preloader PopupWindows
*/

require('./include/common')('popup-no-web3');
const electron = require('electron');
const mist = require('../mistAPI.js');
const syncMinimongo = require('../syncMinimongo.js');
const ipc = electron.ipcRenderer;
const ipcProviderWrapper = require('../ipc/ipcProviderWrapper.js');

require('./include/setBasePath')('interface');

// register with window manager
ipc.send('backendAction_setWindowId');

// disable pinch zoom
electron.webFrame.setZoomLevelLimits(1, 1);

// receive data in the popupWindow
ipc.on('data', function(e, data) {
    Session.set('data', data);
})

window.ipc = ipc;
window.mist = mist();
window.syncMinimongo = syncMinimongo;
