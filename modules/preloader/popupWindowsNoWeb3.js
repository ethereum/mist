/**
@module preloader PopupWindows
*/

require('babel-register');
require('./include/common')('popupWindow');
const { ipcRenderer, remote, webFrame } = require('electron');
const mist = require('./include/mistAPI.js');
const dbSync = require('../dbSync.js');
require('./include/setBasePath')('interface');
require('./include/openExternal.js');

// receive data in from SendData
ipcRenderer.on('uiAction_sendData', (e, data) => {
  Session.set('data', data);
});

window.mist = mist();
window.mistMode = remote.getGlobal('mode');
window.dirname = remote.getGlobal('dirname');
window.dbSync = dbSync;
window.ipc = ipcRenderer;

window.i18n = require('../i18n.js');

// Initialise the Redux store
window.store = require('./rendererStore');
