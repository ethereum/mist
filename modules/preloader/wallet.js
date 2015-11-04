/**
@module preloader wallet
*/
const mist = require('../mistAPI.js');
const shell = require('shell');
const BigNumber = require('bignumber.js');
const Web3 = require('web3');
const ipcProviderWrapper = require('../ipc/ipcProviderWrapper.js');
const web3Admin = require('../web3Admin.js');

// disable pinch zoom
require('web-frame').setZoomLevelLimits(1, 1);


// open a[target="_blank"] in external browser
document.addEventListener('click', function(e) {
    if(e.target.nodeName === 'A' && e.target.attributes.target && e.target.attributes.target.value === "_blank") {
        e.preventDefault();
        shell.openExternal(e.target.href);
    }
}, false);


// make variables globally accessable
// window.dirname = __dirname;
window.BigNumber = BigNumber;
window.web3 = new Web3(new Web3.providers.IpcProvider('', ipcProviderWrapper));
web3Admin.extend(window.web3);


window.mist = mist(true);
window.platform = process.platform;

setTimeout(function(){
    document.getElementsByTagName('html')[0].className =  window.platform;
}, 100);
