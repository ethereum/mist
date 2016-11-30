/**
@module preloader PopupWindows
*/

require('./popupWindowsNoWeb3.js');

const ipcProviderWrapper = require('../ipc/ipcProviderWrapper.js');
const BigNumber = require('bignumber.js');
const Q = require('bluebird');
const Web3 = require('web3');
const web3Admin = require('../web3Admin.js');
const https = require('https');

require('./include/openPopup.js');


// make variables globally accessable
window.BigNumber = BigNumber;
window.Q = Q;
window.https = https;
window.web3 = new Web3(new Web3.providers.IpcProvider('', ipcProviderWrapper));
web3Admin.extend(window.web3);
