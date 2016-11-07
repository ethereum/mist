/**
@module preloader wallet
*/

require('./include/common')('wallet');
const { ipcRenderer: ipc, webFrame } = require('electron');
const mist = require('../mistAPI.js');
const BigNumber = require('bignumber.js');
const Web3 = require('web3');
const ipcProviderWrapper = require('../ipc/ipcProviderWrapper.js');
const web3Admin = require('../web3Admin.js');

require('./include/openExternal.js');
require('./include/setBasePath')('interface/wallet');

// disable pinch zoom
webFrame.setZoomLevelLimits(1, 1);


// make variables globally accessable
// window.dirname = __dirname;
window.BigNumber = BigNumber;
window.web3 = new Web3(new Web3.providers.IpcProvider('', ipcProviderWrapper));

// add admin later
setTimeout(() => {
    web3Admin.extend(window.web3);
}, 1000);

// prevent overwriting the Dapps Web3
delete global.Web3;
delete window.Web3;

window.mist = mist(true);

setTimeout(() => {
    if (document.getElementsByTagName('html')[0])
        { document.getElementsByTagName('html')[0].className = window.platform; }
}, 500);
