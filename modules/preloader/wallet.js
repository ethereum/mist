/**
@module preloader wallet
*/

const { webFrame } = require('electron');

require('./dapps.js');

webFrame.executeJavaScript("window.mistMode = 'mist';");
