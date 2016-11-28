/**
@module preloader PopupWindows
*/

require('./include/common')('popupWindow');
const { ipcRenderer: ipc, remote, webFrame } = require('electron');
const mist = require('../mistAPI.js');
const dbSync = require('../dbSync.js');

require('./include/setBasePath')('interface');
require('./include/openExternal.js');


// disable pinch zoom
webFrame.setZoomLevelLimits(1, 1);

// receive data in from SendData
ipc.on('uiAction_sendData', (e, data) => {
    Session.set('data', data);
});

window.mist = mist();
window.dirname = remote.getGlobal('dirname');
window.dbSync = dbSync;
window.ipc = ipc;
