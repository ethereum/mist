/**
@module preloader tests
*/

if (location.origin !== 'file://') {
  throw new Error('Wrong test file loaded');
} else {
  // load dapp preloader file
  require('./dapps.js');

  const electron = require('electron');
  const ipcRenderer = electron.ipcRenderer;

  window.ipcProvider = require('../ipc/ipcProviderWrapper.js');
  window.permissions = {};

  ipcRenderer.sendToHost('sendTestData');
  ipcRenderer.on('uiAction_sendTestData', function(e, permissions, coinbase) {
    window.permissions = permissions;
    window.coinbase = coinbase;
  });
}
