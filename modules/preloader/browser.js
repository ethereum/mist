/**
@module preloader browser
*/

const ipc = require('ipc');
require('../getFavicon.js');

// notifiy the tab to store the webview id
ipc.sendToHost('setWebviewId');

