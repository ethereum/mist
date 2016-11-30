/**
@module preloader wallet
*/

require('./browser.js');
require('./include/openExternal.js');
require('./include/setBasePath')('interface/wallet');

const web3Admin = require('../web3Admin.js');

// make the wallet respond to the mode
window.mistMode = 'mist';

// make variables globally accessable
// window.dirname = __dirname;

// add admin later
setTimeout(() => {
    web3Admin.extend(window.web3);
}, 1000);

setTimeout(() => {
    if (document.getElementsByTagName('html')[0])
        { document.getElementsByTagName('html')[0].className = window.platform; }
}, 500);
