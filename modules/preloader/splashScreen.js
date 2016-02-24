const ipc = require('electron').ipcRenderer;
require('../openExternal.js');

// disable pinch zoom
require('web-frame').setZoomLevelLimits(1, 1);

window.ipc = ipc;
window.mode = location.hash.replace('#splashScreen_','');
window.dirname = __dirname.replace('modules/preloader','').replace('modules\\preloader','');