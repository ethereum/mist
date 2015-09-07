/**
@module WalletPreloader
*/

const shell = require('shell');
const web3 = require('web3');
const ipcProviderWrapper = require('../ipc/ipcProviderWrapper.js');

const web3Admin = require('./web3Admin');
web3Admin.extend(web3);

// set web3 providor
web3.setProvider(new web3.providers.IpcProvider('', ipcProviderWrapper));


// open a[target="_blank"] in external browser
document.addEventListener('click', function(e) {
    if(e.target.nodeName === 'A' && e.target.attributes.target && e.target.attributes.target.value === "_blank") {
        e.preventDefault();
        shell.openExternal(e.target.href);
    }
}, false);


// make variables globally accessable
// window.dirname = __dirname;
window.web3 = web3;
window.platform = process.platform;

setTimeout(function(){
    document.getElementsByTagName('html')[0].className =  window.platform;
}, 100);
