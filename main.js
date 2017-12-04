global._ = require('./modules/utils/underscore');
const { app, dialog, ipcMain, shell, protocol } = require('electron');
const timesync = require('os-timesync');
const dbSync = require('./modules/dbSync.js');
const i18n = require('./modules/i18n.js');
const logger = require('./modules/utils/logger');
const Sockets = require('./modules/socketManager');
const Windows = require('./modules/windows');
const ClientBinaryManager = require('./modules/clientBinaryManager');
const UpdateChecker = require('./modules/updateChecker');
const Settings = require('./modules/settings');
const Q = require('bluebird');
const windowStateKeeper = require('electron-window-state');
const log = logger.create('main');

import configureReduxStore from './modules/core/store';
import { quitApp } from './modules/core/ui/actions';
import { setLanguageOnMain } from './modules/core/settings/actions';

Q.config({
    cancellation: true,
});


global.store = configureReduxStore();

Settings.init();

const db = global.db = require('./modules/db');

require('./modules/ipcCommunicator.js');
const appMenu = require('./modules/menuItems');
const ipcProviderBackend = require('./modules/ipc/ipcProviderBackend.js');
const ethereumNode = require('./modules/ethereumNode.js');
const swarmNode = require('./modules/swarmNode.js');
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
let splashWindow;
let onReady;
let startMainWindow;

// This method will be called when Electron has done everything
// initialization and ready for creating browser windows.
app.on('ready', async () => {
    // if using HTTP RPC then inform user
    if (Settings.rpcMode === 'http') {
        dialog.showErrorBox('Insecure RPC connection', `
WARNING: You are connecting to an Ethereum node via: ${Settings.rpcHttpPath}

This is less secure than using local IPC - your passwords will be sent over the wire in plaintext.

Only do this if you have secured your HTTP connection or you know what you are doing.
`);
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

// Allows the Swarm protocol to behave like http
protocol.registerStandardSchemes(['bzz']);

onReady = () => {
    global.config = db.getCollection('SYS_config');

    // setup DB sync to backend
    dbSync.backendSyncInit();
    store.dispatch({ type: '[MAIN]:DB:SYNC_TO_BACKEND' });

    // Initialise window mgr
    Windows.init();

    // Enable the Swarm protocol
    protocol.registerHttpProtocol('bzz', (request, callback) => {
        const redirectPath = `${Settings.swarmURL}/${request.url.replace('bzz:/', 'bzz://')}`;
        callback({ method: request.method, referrer: request.referrer, url: redirectPath });
        store.dispatch({ type: '[MAIN]:PROTOCOL:REGISTER', payload: { protocol: 'bzz' } });
    }, (error) => {
        if (error) {
            log.error(error);
        }
    });

    // check for update
    if (!Settings.inAutoTestMode) {
        UpdateChecker.run();
        store.dispatch({ type: '[MAIN]:UPDATE_CHECKER:FINISHED' });
    }

    // initialize the web3 IPC provider backend
    ipcProviderBackend.init();
    store.dispatch({ type: '[MAIN]:IPC_PROVIDER_BACKEND:INIT' });

    // instantiate custom protocols
    // require('./customProtocols.js');

    // change to user language now that global.config object is ready
    store.dispatch(setLanguageOnMain(Settings.language));

    // add menu already here, so we have copy and paste functionality
    appMenu();

    global.defaultWindow = windowStateKeeper({ defaultWidth: 1024 + 208, defaultHeight: 720 });

    // Create the browser window.
    mainWindow = Windows.create('main');

    // Delegating events to save window bounds on windowStateKeeper
    global.defaultWindow.manage(mainWindow.window);

    if (!Settings.inAutoTestMode) { splashWindow = Windows.create('splash'); }

    // Checks time sync
    if (!Settings.skiptimesynccheck) {
        timesync.checkEnabled((err, enabled) => {
            if (err) {
                log.error('Couldn\'t infer if computer automatically syncs time.', err);
                return;
            }

            if (!enabled) {
                dialog.showMessageBox({
                    type: 'warning',
                    buttons: ['OK'],
                    message: global.i18n.t('mist.errors.timeSync.title'),
                    detail: `${global.i18n.t('mist.errors.timeSync.description')}\n\n${global.i18n.t(`mist.errors.timeSync.${process.platform}`)}`,
                }, () => {
                });
            }
        });
    }


    const kickStart = async () => {
        ipcMain.on('retryConnection', () => {
            kickStart();
        });

        ClientBinaryManager.on('status', (status, data) => {
            Windows.broadcast('uiAction_clientBinaryStatus', status, data);
        });

        ethereumNode.on('nodeConnectionTimeout', () => {
            Windows.broadcast('uiAction_nodeStatus', 'connectionTimeout');
        });

        ethereumNode.on('nodeLog', (data) => {
            Windows.broadcast('uiAction_nodeLogText', data.replace(/^.*[0-9]]/, ''));
        });

        ethereumNode.on('state', (state, stateAsText) => {
            Windows.broadcast('uiAction_nodeStatus', stateAsText,
                ethereumNode.STATES.ERROR === state ? ethereumNode.lastError : null
            );
        });

        swarmNode.on('starting', () => {
            Windows.broadcast('uiAction_swarmStatus', 'starting');
            store.dispatch({ type: '[MAIN]:SWARM:INIT_START' });
        });

        swarmNode.on('downloadProgress', (progress) => {
            Windows.broadcast('uiAction_swarmStatus', 'downloadProgress', progress);
        });

        swarmNode.on('started', (isLocal) => {
            Windows.broadcast('uiAction_swarmStatus', 'started', isLocal);
            store.dispatch({ type: '[MAIN]:SWARM:INIT_FINISH' });
        });


        const syncResultPromise = new Q((resolve, reject) => {
            nodeSync.on('nodeSyncing', (result) => {
                Windows.broadcast('uiAction_nodeSyncStatus', 'inProgress', result);
            });

            nodeSync.on('stopped', () => {
                Windows.broadcast('uiAction_nodeSyncStatus', 'stopped');
            });

            nodeSync.on('error', (err) => {
                log.error('Error syncing node', err);

                reject(err);
            });

            nodeSync.on('finished', () => {
                nodeSync.removeAllListeners('error');
                nodeSync.removeAllListeners('finished');

                resolve();
            });
        });

        // Check legacy chain
        if ((Settings.loadUserData('daoFork') || '').trim() === 'false') {
            dialog.showMessageBox({
                type: 'warning',
                buttons: ['OK'],
                message: global.i18n.t('mist.errors.legacyChain.title'),
                detail: global.i18n.t('mist.errors.legacyChain.description')
            }, () => {
                shell.openExternal('https://github.com/ethereum/mist/releases');
                store.dispatch(quitApp());
            });

            throw new Error('Cant start client due to legacy non-Fork setting.');
        }

        await ClientBinaryManager.init();
        await ethereumNode.init();

        // Wallet shouldn't start Swarm || TODO: TravisCI failing to download Swarm
        if (global.mode === 'wallet' || Settings.inAutoTestMode) {
            log.info('skipping Swarm');
        } else {
            await swarmNode.init();
        }

        // Sanity check function
        if (!ethereumNode.isIpcConnected) {
            throw new Error('Either the node didn\'t start or IPC socket failed to connect.');
        }

        // At this point Geth is running and the socket is connected.
        log.info('Connected via IPC to node.');

        // update menu, to show node switching possibilities
        appMenu();

        // #getAccounts
        const resultData = await ethereumNode.send('eth_accounts', []);

        // #onboarding
        if (ethereumNode.isGeth && (resultData.result === null || (_.isArray(resultData.result) && resultData.result.length === 0))) {
            log.info('No accounts setup yet, lets do onboarding first.');

            await new Q((resolve, reject) => {
                const onboardingWindow = Windows.createPopup('onboardingScreen');

                onboardingWindow.on('closed', () => store.dispatch(quitApp()));

                // change network types (mainnet, testnet)
                ipcMain.on('onBoarding_changeNet', (e, testnet) => {
                    const newType = ethereumNode.type;
                    const newNetwork = testnet ? 'rinkeby' : 'main';

                    log.debug('Onboarding change network', newType, newNetwork);

                    ethereumNode.restart(newType, newNetwork)
                        .then(function nodeRestarted() {
                            appMenu();
                        })
                        .catch((err) => {
                            log.error('Error restarting node', err);

                            reject(err);
                        });
                });

                // launch app
                ipcMain.on('onBoarding_launchApp', () => {
                    // prevent that it closes the app
                    onboardingWindow.removeAllListeners('closed');
                    onboardingWindow.close();

                    ipcMain.removeAllListeners('onBoarding_changeNet');
                    ipcMain.removeAllListeners('onBoarding_launchApp');

                    resolve();
                });

                if (splashWindow) { splashWindow.hide(); }
            });
        }

        // #doSync
        if (splashWindow) { splashWindow.show(); }
        if (!Settings.inAutoTestMode) { await syncResultPromise; }

        await startMainWindow();
    }; /* kick start */

    splashWindow ? splashWindow.on('ready', kickStart) : kickStart();
}; /* onReady() */


/**
Start the main window and all its processes

@method startMainWindow
*/
startMainWindow = () => {
    log.info(`Loading Interface at ${global.interfaceAppUrl}`);

    mainWindow.on('ready', () => {
        if (splashWindow) { splashWindow.close(); }
        mainWindow.show();
    });

    mainWindow.load(global.interfaceAppUrl);

    mainWindow.on('closed', () => store.dispatch(quitApp()));

    // observe Tabs for changes and refresh menu
    const Tabs = global.db.getCollection('UI_tabs');
    const sortedTabs = Tabs.getDynamicView('sorted_tabs') || Tabs.addDynamicView('sorted_tabs');
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
};
