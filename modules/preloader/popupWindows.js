/**
@module preloader PopupWindows
*/

require('./popupWindowsNoWeb3.js');
require('./include/web3CurrentProvider.js');
const Q = require('bluebird');
const https = require('https');

// make variables globally accessable
window.Q = Q;
window.https = https;
