/**
@module preloader PopupWindows
*/

require('./include/common')('popup-no-web3');
const { ipcRenderer: ipc, remote, webFrame } = require('electron');
const mist = require('../mistAPI.js');
const ipcProviderWrapper = require('../ipc/ipcProviderWrapper.js');
const dbSync = require('../dbSync.js');

require('./include/setBasePath')('interface');


// disable pinch zoom
webFrame.setZoomLevelLimits(1, 1);

// receive data in the popupWindow
ipc.on('data', (e, data) => {
    Session.set('data', data);
});

window.mist = mist();
window.dirname = remote.getGlobal('dirname');
window.dbSync = dbSync;
window.ipc = ipc;
