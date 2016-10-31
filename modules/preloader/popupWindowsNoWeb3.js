/**
@module preloader PopupWindows
*/

require('./include/common')('popup-no-web3');
const electron = require('electron');
const remote = electron.remote;
const mist = require('../mistAPI.js');
const syncDb = require('../syncDb.js');
const ipc = electron.ipcRenderer;
const ipcProviderWrapper = require('../ipc/ipcProviderWrapper.js');

require('./include/setBasePath')('interface');


// disable pinch zoom
electron.webFrame.setZoomLevelLimits(1, 1);

// receive data in the popupWindow
ipc.on('data', function(e, data) {
    Session.set('data', data);
})

window.ipc = ipc;
window.mist = mist();
window.dirname = remote.getGlobal('dirname');
window.syncDb = syncDb;
