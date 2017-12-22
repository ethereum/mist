global._ = require('./modules/utils/underscore');
const { app, dialog, ipcMain, shell, protocol } = require('electron');
const dbSync = require('./modules/dbSync.js');
const i18n = require('./modules/i18n.js');
const logger = require('./modules/utils/logger');
const Sockets = require('./modules/socketManager');
const Q = require('bluebird');
const log = logger.create('main');
const Settings = require('./modules/settings');

import configureReduxStore from './modules/core/store';
import { quitApp } from './modules/core/ui/actions';
import { setLanguageOnMain, toggleSwarm, runClientBinaryManager, runUpdateChecker, checkTimeSync } from './modules/core/settings/actions';
import { runSwarm } from './modules/core/swarm/actions';
import { runIPFS } from './modules/core/ipfs/actions';
import { startEthereumNode } from './modules/core/ethereum_node/actions';
import { syncAccounts, handleOnboarding } from './modules/core/accounts/actions';
import { createCoreWindows, startMainWindow } from './modules/core/windows/actions';
import { NodeState } from './modules/core/constants';
import swarmNode from './modules/swarmNode.js';

Q.config({
    cancellation: true,
});

// For debugging
process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

global.store = configureReduxStore();

import Web3 from 'web3';
global.web3 = new Web3(store.getState().ethereumNode.providerAddress || 'https://mainnet.infura.io/76PyENot1npWxmi8u28i');

Settings.init();

const db = global.db = require('./modules/db');

require('./modules/ipcCommunicator.js');
const appMenu = require('./modules/menuItems');
const ipcProviderBackend = require('./modules/ipc/ipcProviderBackend.js');
const ethereumNode = require('./modules/ethereumNode.js');
const nodeSync = require('./modules/nodeSync.js');

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

    global.interfaceAppUrl = (Settings.inProductionMode)
        ? `file://${__dirname}/interface/wallet/index.html`
        : 'http://localhost:3050';
    global.interfacePopupsUrl = (Settings.inProductionMode)
        ? `file://${__dirname}/interface/index.html`
        : 'http://localhost:3000';

// - MIST
} else {
    log.info('Starting in Mist mode');

    let url = (Settings.inProductionMode)
        ? `file://${__dirname}/interface/index.html`
        : 'http://localhost:3000';

    if (Settings.cli.resetTabs) {
        url += '?reset-tabs=true';
    }

    global.interfaceAppUrl = global.interfacePopupsUrl = url;
}

// prevent crashes and close gracefully
process.on('uncaughtException', (error) => {
    log.error('UNCAUGHT EXCEPTION', error);
    store.dispatch(quitApp());
});

// Quit when all windows are closed.
app.on('window-all-closed', () => store.dispatch(quitApp()));

// Listen to custom protocol incoming messages, needs registering of URL schemes
app.on('open-url', (e, url) => log.info('Open URL', url));

let killedSocketsAndNodes = false;

app.on('before-quit', async (event) => {
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
            store.dispatch({ type: '[ETHEREUM]:NODE:STOP' });

            killedSocketsAndNodes = true;
            await db.close();
            store.dispatch({ type: '[MAIN]:DB:CLOSE' });

            store.dispatch(quitApp());
        }, 500);
    } else {
        log.info('About to quit...');
    }
});

app.on('ready', async () => {
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
store.dispatch({ type: '[MAIN]:PROTOCOL:REGISTER', payload: { protocol: 'bzz' } });

function onReady() {
    global.config = db.getCollection('SYS_config');

    dbSync.initializeListeners();

    enableSwarmProtocol();

    store.dispatch(runUpdateChecker());

    // TODO: Settings.language relies on global.config object being set
    store.dispatch(setLanguageOnMain(Settings.language));

    appMenu();

    store.dispatch(createCoreWindows());

    // store.dispatch(checkTimeSync());  // TODO: Investigate if this is still necessary 

    kickStart();
}

function enableSwarmProtocol() {
    protocol.registerHttpProtocol('bzz', (request, callback) => {
        if ([NodeState.Disabling, NodeState.Disabled].includes(store.getState().swarm.nodeState)) {
            const error = global.i18n.t('mist.errors.swarm.notEnabled');
            dialog.showErrorBox('Note', error);
            callback({ error });
            store.dispatch({ type: '[MAIN]:PROTOCOL:ERROR', payload: { protocol: 'bzz', error } });
            return;
        }

        const redirectPath = `${Settings.swarmURL}/${request.url.replace('bzz:/', 'bzz://')}`;

        if (store.getState().swarm.nodeState === NodeState.Enabling) {
            swarmNode.on('started', () => {
                callback({ method: request.method, referrer: request.referrer, url: redirectPath });
            });
        } else { // Swarm enabled
            callback({ method: request.method, referrer: request.referrer, url: redirectPath });
        }

        store.dispatch({ type: '[MAIN]:PROTOCOL:REQUEST', payload: { protocol: 'bzz' } });

    }, (error) => {
        if (error) {
            log.error(error);
        }
    });
}

async function kickStart() {
    store.dispatch(runClientBinaryManager());

    store.dispatch(startEthereumNode());

    store.dispatch(runSwarm());

    store.dispatch(runIPFS());

    // Update menu, to show node switching possibilities
    appMenu();

    store.dispatch(handleOnboarding());
}