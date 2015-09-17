const ipc = require('ipc');

window.ipc = ipc;
window.mode = location.hash.replace('#splashScreen_','');
window.dirname = __dirname.replace('modules/preloader','');