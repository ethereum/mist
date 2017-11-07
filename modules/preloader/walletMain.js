/**
@module preloader wallet when loaded in the main window
*/

require('./dapps.js');
require('./include/openExternal.js');
require('./include/setBasePath')('interface/wallet');
const {webFrame} = require('electron');
const web3Admin = require('../web3Admin.js');

// make variables globally accessable
// window.dirname = __dirname;

webFrame.executeJavaScript("window.mistMode = 'wallet';");


// add admin later
setTimeout(() => {
    web3Admin.extend(window.web3);
}, 1000);

setTimeout(() => {
    if (document.getElementsByTagName('html')[0]) {
        document.getElementsByTagName('html')[0].className = window.platform;
    }
}, 500);
