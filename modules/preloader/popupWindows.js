/**
@module preloader PopupWindows
*/

const Q = require('bluebird');
const https = require('https');
require('./popupWindowsNoWeb3.js');
require('./include/openPopup.js');

// make variables globally accessable
window.Q = Q;
window.https = https;
window.web3 = global.web3

// Initialise the Redux store
window.store = require('./rendererStore');