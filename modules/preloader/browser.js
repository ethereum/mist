/**
@module preloader browser
*/

const ipc = require('ipc');
require('../loadFavicon.js');

// notifiy the tab to store the webview id
ipc.sendToHost('setWebviewId');

