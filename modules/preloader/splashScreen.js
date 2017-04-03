require('./include/common')('splashscreen');
require('./include/ethereumProvider.js');
const mist = require('./include/mistAPI.js');
const { ipcRenderer, remote, webFrame } = require('electron');

require('./include/openExternal.js');
require('./include/setBasePath')('interface');


// get and set language
ipcRenderer.send('backendAction_setLanguage', navigator.language);

// disable pinch zoom
webFrame.setZoomLevelLimits(1, 1);

window.ipc = ipcRenderer;
window.mist = mist();
window.mistMode = remote.getGlobal('mode');
window.dirname = remote.getGlobal('dirname');
