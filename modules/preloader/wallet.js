/**
@module preloader wallet
*/
const mist = require('../mistAPI.js');
require('../openExternal.js');
const BigNumber = require('bignumber.js');
const Web3 = require('web3');
const ipcProviderWrapper = require('../ipc/ipcProviderWrapper.js');
const web3Admin = require('../web3Admin.js');


// disable pinch zoom
require('web-frame').setZoomLevelLimits(1, 1);


// make variables globally accessable
// window.dirname = __dirname;
window.BigNumber = BigNumber;
window.web3 = new Web3(new Web3.providers.IpcProvider('', ipcProviderWrapper));
web3Admin.extend(window.web3);


window.mist = mist(true);
window.platform = process.platform;

setTimeout(function(){
    if(document.getElementsByTagName('html')[0])
        document.getElementsByTagName('html')[0].className =  window.platform;
}, 500);
