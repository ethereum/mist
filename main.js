global._ = require('./modules/utils/underscore');

const { app, dialog, ipcMain, shell, protocol } = require('electron');
const Q = require('bluebird');
const windowStateKeeper = require('electron-window-state');
const timesync = require('os-timesync');

const dbSync = require('./modules/dbSync.js');
const i18n = require('./modules/i18n.js');
const Sockets = require('./modules/socketManager');
const Windows = require('./modules/windows');
const ClientBinaryManager = require('./modules/clientBinaryManager');
const UpdateChecker = require('./modules/updateChecker');
const log = require('./modules/utils/logger').create('main');
const Settings = require('./modules/settings');

import configureReduxStore from './modules/core/store';

import { quitApp } from './modules/core/ui/actions';
import {
  setLanguageOnMain,
  toggleSwarm
} from './modules/core/settings/actions';
import { setActiveNode } from './modules/core/nodes/actions';
import { SwarmState } from './modules/core/settings/reducer';

import swarmNode from './modules/swarmNode.js';
import ethereumNodeRemote from './modules/ethereumNodeRemote';

Q.config({
  cancellation: true
});

global.store = configureReduxStore();

Settings.init();

store.subscribe(() => {
  store.dispatch(setActiveNode());
});

const db = (global.db = require('./modules/db'));

require('./modules/ipcCommunicator.js');
const appMenu = require('./modules/menuItems');
const ipcProviderBackend = require('./modules/ipc/ipcProviderBackend.js');
const ethereumNode = require('./modules/ethereumNode.js');

// Define global vars; The preloader makes some globals available to the client.
global.webviews = [];
global.mining = false;
global.mode = store.getState().settings.uiMode;
global.icon = `${__dirname}/icons/${global.mode}/icon.png`;
global.dirname = __dirname;
global.i18n = i18n;

// INTERFACE PATHS
// - WALLET
if (global.mode === 'wallet') {
  log.info('Starting in Wallet mode');

  global.interfaceAppUrl = Settings.inProductionMode
    ? `file://${__dirname}/interface/wallet/index.html`
    : 'http://localhost:3050';
  global.interfacePopupsUrl = Settings.inProductionMode
    ? `file://${__dirname}/interface/index.html`
    : 'http://localhost:3000';

  // - MIST
} else {
  log.info('Starting in Mist mode');

  let url = Settings.inProductionMode
    ? `file://${__dirname}/interface/index.html`
    : 'http://localhost:3000';

  if (Settings.cli.resetTabs) {
    url += '?reset-tabs=true';
  }

  global.interfaceAppUrl = global.interfacePopupsUrl = url;
}

// prevent crashes and close gracefully
process.on('uncaughtException', error => {
  log.error('UNCAUGHT EXCEPTION', error);
  store.dispatch(quitApp());
});

// Quit when all windows are closed.
app.on('window-all-closed', () => store.dispatch(quitApp()));

// Listen to custom protocol incoming messages, needs registering of URL schemes
app.on('open-url', (e, url) => log.info('Open URL', url));

let killedSocketsAndNodes = false;

app.on('before-quit', async event => {
  if (!killedSocketsAndNodes) {
    log.info('Defer quitting until sockets and node are shut down');

    event.preventDefault();

    // sockets manager
    try {
      await Sockets.destroyAll();
      store.dispatch({ type: '[MAIN]:SOCKETS:DESTROY' });
    } catch (e) {
      log.error('Error shutting down sockets');
    }

    // delay quit, so the sockets can close
    setTimeout(async () => {
      await ethereumNode.stop();
      store.dispatch({ type: '[MAIN]:ETH_NODE:STOP' });

      killedSocketsAndNodes = true;
      await db.close();
      store.dispatch({ type: '[MAIN]:DB:CLOSE' });

      store.dispatch(quitApp());
    }, 500);
  } else {
    log.info('About to quit...');
  }
});

let mainWindow;

// This method will be called when Electron has done everything
// initialization and ready for creating browser windows.
app.on('ready', async () => {
  // if using HTTP RPC then inform user
  if (Settings.rpcMode === 'http') {
    dialog.showErrorBox(
      'Insecure RPC connection',
      `
WARNING: You are connecting to an Ethereum node via: ${Settings.rpcHttpPath}

This is less secure than using local IPC - your passwords will be sent over the wire in plaintext.

Only do this if you have secured your HTTP connection or you know what you are doing.
`
    );
  }

  // initialise the db
  try {
    await global.db.init();
    store.dispatch({ type: '[MAIN]:DB:INIT' });
    onReady();
  } catch (e) {
    log.error(e);
    store.dispatch(quitApp());
  }
});

protocol.registerStandardSchemes(['bzz']);
store.dispatch({
  type: '[MAIN]:PROTOCOL:REGISTER',
  payload: { protocol: 'bzz' }
});

function onReady() {
  global.config = db.getCollection('SYS_config');

  dbSync.initializeListeners();

  Windows.init();

  enableSwarmProtocol();

  if (!Settings.inAutoTestMode) {
    UpdateChecker.run();
  }

  ipcProviderBackend.init();

  ethereumNode.init();

  ethereumNodeRemote.start();

  // TODO: Settings.language relies on global.config object being set
  store.dispatch(setLanguageOnMain(Settings.language));

  appMenu();

  createCoreWindows();

  checkTimeSync();

  initializeListeners();

  checkForLegacyChain();

  ClientBinaryManager.init();

  if (Settings.enableSwarmOnStart) {
    store.dispatch(toggleSwarm());
  }

  // Update menu (to show node switching possibilities)
  appMenu();

  startMainWindow();
}

function enableSwarmProtocol() {
  protocol.registerHttpProtocol(
    'bzz',
    (request, callback) => {
      if (
        [SwarmState.Disabling, SwarmState.Disabled].includes(
          store.getState().settings.swarmState
        )
      ) {
        const error = global.i18n.t('mist.errors.swarm.notEnabled');
        dialog.showErrorBox('Note', error);
        callback({ error });
        store.dispatch({
          type: '[MAIN]:PROTOCOL:ERROR',
          payload: { protocol: 'bzz', error }
        });
        return;
      }

      const redirectPath = `${Settings.swarmURL}/${request.url.replace(
        'bzz:/',
        'bzz://'
      )}`;

      if (store.getState().settings.swarmState === SwarmState.Enabling) {
        swarmNode.on('started', () => {
          callback({
            method: request.method,
            referrer: request.referrer,
            url: redirectPath
          });
        });
      } else {
        // Swarm enabled
        callback({
          method: request.method,
          referrer: request.referrer,
          url: redirectPath
        });
      }

      store.dispatch({
        type: '[MAIN]:PROTOCOL:REQUEST',
        payload: { protocol: 'bzz' }
      });
    },
    error => {
      if (error) {
        log.error(error);
      }
    }
  );
}

function createCoreWindows() {
  global.defaultWindow = windowStateKeeper({
    defaultWidth: 1024 + 208,
    defaultHeight: 720
  });

  // Create the browser window.
  mainWindow = Windows.create('main');

  // Delegating events to save window bounds on windowStateKeeper
  global.defaultWindow.manage(mainWindow.window);
}

function checkTimeSync() {
  if (!Settings.skiptimesynccheck) {
    timesync.checkEnabled((err, enabled) => {
      if (err) {
        log.error("Couldn't infer if computer automatically syncs time.", err);
        return;
      }

      if (!enabled) {
        dialog.showMessageBox(
          {
            type: 'warning',
            buttons: ['OK'],
            message: global.i18n.t('mist.errors.timeSync.title'),
            detail: `${global.i18n.t(
              'mist.errors.timeSync.description'
            )}\n\n${global.i18n.t(`mist.errors.timeSync.${process.platform}`)}`
          },
          () => {}
        );
      }
    });
  }
}

function checkForLegacyChain() {
  if ((Settings.loadUserData('daoFork') || '').trim() === 'false') {
    dialog.showMessageBox(
      {
        type: 'warning',
        buttons: ['OK'],
        message: global.i18n.t('mist.errors.legacyChain.title'),
        detail: global.i18n.t('mist.errors.legacyChain.description')
      },
      () => {
        shell.openExternal('https://github.com/ethereum/mist/releases');
        store.dispatch(quitApp());
      }
    );

    throw new Error('Cant start client due to legacy non-Fork setting.');
  }
}

function initializeListeners() {
  ClientBinaryManager.on('status', (status, data) => {
    Windows.broadcast('uiAction_clientBinaryStatus', status, data);
  });

  ethereumNode.on('nodeConnectionTimeout', () => {
    Windows.broadcast('uiAction_nodeStatus', 'connectionTimeout');
  });

  ethereumNode.on('nodeLog', data => {
    Windows.broadcast('uiAction_nodeLogText', data.replace(/^.*[0-9]]/, ''));
  });

  ethereumNode.on('state', (state, stateAsText) => {
    Windows.broadcast(
      'uiAction_nodeStatus',
      stateAsText,
      ethereumNode.STATES.ERROR === state ? ethereumNode.lastError : null
    );
  });
}

function startMainWindow() {
  log.info(`Loading Interface at ${global.interfaceAppUrl}`);
  initializeMainWindowListeners();
  initializeTabs();
}

function initializeMainWindowListeners() {
  mainWindow.on('ready', () => {
    mainWindow.show();
  });

  // If in wallet mode, first show loading window
  // then load wallet url once node connection is established.
  // Otherwise, load immediately since we already
  // have this logic in Mist in webviews.html
  if (global.mode !== 'wallet') {
    mainWindow.load(global.interfaceAppUrl);
  } else {
    mainWindow.load(
      'data:text/html,<div class="loadingspinner"></div><style>body{background: #f1f1f1;height:100vh;margin: 0;padding: 0;display: flex;justify-content: center;align-items: center;}.loadingspinner{pointer-events: none;width: 3em;height: 3em;border: 0.4em solid transparent;border-color: #eee;border-top-color: #3E67EC;border-radius: 50%;animation: loadingspin 1s linear infinite;}@keyframes loadingspin{100% {transform: rotate(360deg)}</style>'
    );
    const unsubscribe = store.subscribe(() => {
      if (
        store.getState().nodes.remote.blockNumber > 100 ||
        store.getState().nodes.local.blockNumber > 0
      ) {
        // Connected to node!
        mainWindow.load(global.interfaceAppUrl);
        unsubscribe();
      }
    });
  }

  mainWindow.on('closed', () => store.dispatch(quitApp()));
}

function initializeTabs() {
  const Tabs = global.db.getCollection('UI_tabs');
  const sortedTabs =
    Tabs.getDynamicView('sorted_tabs') || Tabs.addDynamicView('sorted_tabs');
  sortedTabs.applySimpleSort('position', false);

  const refreshMenu = () => {
    clearTimeout(global._refreshMenuFromTabsTimer);

    global._refreshMenuFromTabsTimer = setTimeout(() => {
      log.debug('Refresh menu with tabs');
      global.webviews = sortedTabs.data();
      appMenu(global.webviews);
      store.dispatch({ type: '[MAIN]:MENU:REFRESH' });
    }, 1000);
  };

  Tabs.on('insert', refreshMenu);
  Tabs.on('update', refreshMenu);
  Tabs.on('delete', refreshMenu);
}
