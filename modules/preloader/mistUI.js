/**
@module preloader MistUI
*/

require('babel-register');

// Initialise the Redux store
window.store = require('./rendererStore');

require('./include/common')('mist');
require('./include/web3CurrentProvider.js');
const { ipcRenderer, remote, webFrame } = require('electron'); // eslint-disable-line import/newline-after-import
const { Menu, MenuItem } = remote;
const dbSync = require('../dbSync.js');
const i18n = require('../i18n.js');
const mist = require('./include/mistAPI.js');

require('./include/setBasePath')('interface');

window.mist = mist();
window.mistMode = remote.getGlobal('mode');
window.dbSync = dbSync;
window.dirname = remote.getGlobal('dirname');
window.ipc = ipcRenderer;

window.i18n = require('../i18n.js');

// remove require and module, because node-integration is on
delete window.module;
delete window.require;

// prevent overwriting the Dapps Web3
// delete global.Web3;
// delete window.Web3;

// set the langauge for the electron interface
// ipcRenderer.send('setLanguage', navigator.language.substr(0,2));

// A message coming from other window, to be passed to a webview
ipcRenderer.on('uiAction_windowMessage', (e, type, id, error, value) => {
  if (type === 'requestAccount' || (type === 'connectAccount' && !error)) {
    Tabs.update(
      { webviewId: id },
      { $addToSet: { 'permissions.accounts': value } }
    );
  }

  // forward to the webview (TODO: remove and manage in the ipcCommunicator?)
  const tab = Tabs.findOne({ webviewId: id });
  if (tab) {
    webview = $(`webview[data-id=${tab._id}]`)[0];
    if (webview) {
      webview.send('uiAction_windowMessage', type, error, value);
    }
  }
});

ipcRenderer.on('uiAction_enableBlurOverlay', (e, value) => {
  $('html').toggleClass('has-blur-overlay', !!value);
});

// Wait for webview toggle
ipcRenderer.on('uiAction_toggleWebviewDevTool', (e, id) => {
  const webview = Helpers.getWebview(id);

  if (!webview) {
    return;
  }

  if (webview.isDevToolsOpened()) {
    webview.closeDevTools();
  } else {
    webview.openDevTools();
  }
});

// randomize accounts and drop half
// also certainly remove the web3.ethbase one
const randomizeAccounts = (acc, coinbase) => {
  let accounts = _.shuffle(acc);
  accounts = _.rest(accounts, (accounts.length / 2).toFixed(0));
  accounts = _.without(accounts, coinbase);
  return accounts;
};

// Run tests
ipcRenderer.on('uiAction_runTests', (e, type) => {
  if (type === 'webview') {
    web3.eth.getAccounts((error, accounts) => {
      if (error) return;

      web3.eth.getCoinbase((coinbaseError, coinbase) => {
        if (coinbaseError) return;

        Tabs.upsert('tests', {
          position: -1,
          name: 'Tests',
          url: '', // is hardcoded in webview.html to prevent hijacking
          permissions: {
            accounts: randomizeAccounts(accounts, coinbase)
          }
        });

        Tracker.afterFlush(() => {
          LocalStore.set('selectedTab', 'tests');
        });

        // update the permissions, when accounts change
        Tracker.autorun(() => {
          const accountList = _.pluck(
            EthAccounts.find({}, { fields: { address: 1 } }).fetch(),
            'address'
          );

          Tabs.update('tests', {
            $set: {
              'permissions.accounts': randomizeAccounts(accountList, coinbase)
            }
          });
        });
      });
    });
  }
});

// CONTEXT MENU

const currentMousePosition = { x: 0, y: 0 };
const menu = new Menu();
// menu.append(new MenuItem({ type: 'separator' }));
menu.append(
  new MenuItem({
    label: i18n.t('mist.rightClick.reload'),
    accelerator: 'Command+R',
    click() {
      const webview = Helpers.getWebview(LocalStore.get('selectedTab'));
      if (LocalStore.get('selectedTab') === 'wallet') {
        return console.log('Cannot refresh the wallet');
      }

      if (webview) {
        webview.reloadIgnoringCache();
      }
    }
  })
);
menu.append(
  new MenuItem({
    label: i18n.t('mist.rightClick.openDevTools'),
    click() {
      const webview = Helpers.getWebview(LocalStore.get('selectedTab'));
      if (webview) {
        webview.openDevTools();
      }
    }
  })
);
menu.append(
  new MenuItem({
    label: i18n.t('mist.rightClick.inspectElements'),
    click() {
      const webview = Helpers.getWebview(LocalStore.get('selectedTab'));
      if (webview) {
        webview.inspectElement(currentMousePosition.x, currentMousePosition.y);
      }
    }
  })
);

window.addEventListener(
  'contextmenu',
  e => {
    e.preventDefault();

    // OPEN CONTEXT MENU over webviews
    if ($('webview:hover')[0]) {
      currentMousePosition.x = e.layerX;
      currentMousePosition.y = e.layerY;
      menu.popup(remote.getCurrentWindow());
    }
  },
  false
);

document.addEventListener(
  'keydown',
  e => {
    // RELOAD current webview, unless on wallet tab
    if (
      LocalStore.get('selectedTab') !== 'wallet' &&
      e.metaKey &&
      e.keyCode === 82
    ) {
      const webview = Helpers.getWebview(LocalStore.get('selectedTab'));
      if (webview) {
        webview.reloadIgnoringCache();
      }
    }
  },
  false
);
