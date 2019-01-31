/**
@module preloader wallet when loaded in the main window
*/

require('./dapps.js');
require('./include/openExternal.js');
require('./include/setBasePath')('interface/wallet');
const { webFrame } = require('electron');

// make variables globally accessable
// window.dirname = __dirname;

webFrame.executeJavaScript("window.mistMode = 'wallet';");

setTimeout(() => {
  if (document.getElementsByTagName('html')[0]) {
    document.getElementsByTagName('html')[0].className = window.platform;
  }
}, 500);
