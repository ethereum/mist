/**
@module preloader PopupWindows
*/

require('./popupWindowsNoWeb3.js');
require('./include/web3CurrentProvider.js');
const https = require('https');

// make variables globally accessable
window.https = https;
