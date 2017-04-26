
global._ = require('./modules/utils/underscore');
const { app, dialog, ipcMain, shell } = require('electron');
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

Q.config({
    cancellation: true,
});


// logging setup
const log = logger.create('main');


Settings.init();

if (Settings.cli.version) {
    log.info(Settings.appVersion);

    process.exit(0);
}

if (Settings.cli.ignoreGpuBlacklist) {
    app.commandLine.appendSwitch('ignore-gpu-blacklist', 'true');
}

if (Settings.inAutoTestMode) {
    log.info('AUTOMATED TESTING');
}

log.info(`Running in production mode: ${Settings.inProductionMode}`);

if (Settings.rpcMode === 'http') {
    log.warn('Connecting to a node via HTTP instead of ipcMain. This is less secure!!!!'.toUpperCase());
}

// db
const db = global.db = require('./modules/db');


require('./modules/ipcCommunicator.js');
const appMenu = require('./modules/menuItems');
const ipcProviderBackend = require('./modules/ipc/ipcProviderBackend.js');
const ethereumNode = require('./modules/ethereumNode.js');
const nodeSync = require('./modules/nodeSync.js');

global.webviews = [];

global.mining = false;

global.icon = `${__dirname}/icons/${Settings.uiMode}/icon.png`;
global.mode = Settings.uiMode;
global.dirname = __dirname;

global.language = 'en';
global.i18n = i18n; // TODO: detect language switches somehow


// INTERFACE PATHS
// - WALLET
if (Settings.uiMode === 'wallet') {
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


// prevent crashed and close gracefully
process.on('uncaughtException', (error) => {
    log.error('UNCAUGHT EXCEPTION', error);
    app.quit();
});


// Quit when all windows are closed.
app.on('window-all-closed', () => {
    app.quit();
});

// Listen to custom protocole incoming messages, needs registering of URL schemes
app.on('open-url', (e, url) => {
    log.info('Open URL', url);
});


let killedSocketsAndNodes = false;

app.on('before-quit', (event) => {
    if (!killedSocketsAndNodes) {
        log.info('Defer quitting until sockets and node are shut down');

        event.preventDefault();

        // sockets manager
        Sockets.destroyAll()
            .catch(() => {
                log.error('Error shutting down sockets');
            });

        // delay quit, so the sockets can close
        setTimeout(() => {
            ethereumNode.stop()
            .then(() => {
                killedSocketsAndNodes = true;

                return db.close();
            })
            .then(() => {
                app.quit();
            });
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
app.on('ready', () => {
    // if using HTTP RPC then inform user
    if (Settings.rpcMode === 'http') {
        dialog.showErrorBox('Insecure RPC connection', `
WARNING: You are connecting to an Ethereum node via: ${Settings.rpcHttpPath}

This is less secure than using local IPC - your passwords will be sent over the wire in plaintext.

Only do this if you have secured your HTTP connection or you know what you are doing.
`);
    }

    // initialise the db
    global.db.init().then(onReady).catch((err) => {
        log.error(err);
        app.quit();
    });
});


onReady = () => {
    // setup DB sync to backend
    dbSync.backendSyncInit();

    // Initialise window mgr
    Windows.init();

    // check for update
    if (!Settings.inAutoTestMode) UpdateChecker.run();

    // initialize the web3 IPC provider backend
    ipcProviderBackend.init();

    // instantiate custom protocols
    // require('./customProtocols.js');

    // add menu already here, so we have copy and past functionality
    appMenu();

    // Create the browser window.

    const defaultWindow = windowStateKeeper({
        defaultWidth: 1024 + 208,
        defaultHeight: 720
    });

    // MIST
    if (Settings.uiMode === 'mist') {
        mainWindow = Windows.create('main', {
            primary: true,
            electronOptions: {
                width: Math.max(defaultWindow.width, 500),
                height: Math.max(defaultWindow.height, 440),
                x: defaultWindow.x,
                y: defaultWindow.y,
                webPreferences: {
                    nodeIntegration: true, /* necessary for webviews;
                        require will be removed through preloader */
                    preload: `${__dirname}/modules/preloader/mistUI.js`,
                    'overlay-fullscreen-video': true,
                    'overlay-scrollbars': true,
                    experimentalFeatures: true,
                },
            },
        });

    // WALLET
    } else {
        mainWindow = Windows.create('main', {
            primary: true,
            electronOptions: {
                width: Math.max(defaultWindow.width, 500),
                height: Math.max(defaultWindow.height, 440),
                x: defaultWindow.x,
                y: defaultWindow.y,
                webPreferences: {
                    preload: `${__dirname}/modules/preloader/walletMain.js`,
                    'overlay-fullscreen-video': true,
                    'overlay-scrollbars': true,
                },
            },
        });
    }

    // Delegating events to save window bounds on windowStateKeeper
    defaultWindow.manage(mainWindow.window);

    if (!Settings.inAutoTestMode) {
        splashWindow = Windows.create('splash', {
            primary: true,
            url: `${global.interfacePopupsUrl}#splashScreen_${Settings.uiMode}`,
            show: true,
            electronOptions: {
                width: 400,
                height: 230,
                resizable: false,
                backgroundColor: '#F6F6F6',
                useContentSize: true,
                frame: false,
                webPreferences: {
                    preload: `${__dirname}/modules/preloader/splashScreen.js`,
                },
            },
        });
    }

    // check time sync
    // var ntpClient = require('ntp-client');
    // ntpClient.getNetworkTime("pool.ntp.org", 123, function(err, date) {
    timesync.checkEnabled((err, enabled) => {
        if (err) {
            log.error('Couldn\'t get time from NTP time sync server.', err);
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


    const kickStart = () => {
        // client binary stuff
        ClientBinaryManager.on('status', (status, data) => {
            Windows.broadcast('uiAction_clientBinaryStatus', status, data);
        });

        // node connection stuff
        ethereumNode.on('nodeConnectionTimeout', () => {
            Windows.broadcast('uiAction_nodeStatus', 'connectionTimeout');
        });

        ethereumNode.on('nodeLog', (data) => {
            Windows.broadcast('uiAction_nodeLogText', data.replace(/^.*[0-9]]/, ''));
        });

        // state change
        ethereumNode.on('state', (state, stateAsText) => {
            Windows.broadcast('uiAction_nodeStatus', stateAsText,
                ethereumNode.STATES.ERROR === state ? ethereumNode.lastError : null
            );
        });


        // capture sync results
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

        // check legacy chain
        // CHECK for legacy chain (FORK RELATED)
        Q.try(() => {
            // open the legacy chain message
            if ((Settings.loadUserData('daoFork') || '').trim() === 'false') {
                dialog.showMessageBox({
                    type: 'warning',
                    buttons: ['OK'],
                    message: global.i18n.t('mist.errors.legacyChain.title'),
                    detail: global.i18n.t('mist.errors.legacyChain.description')
                }, () => {
                    shell.openExternal('https://github.com/ethereum/mist/releases');
                    app.quit();
                });

                throw new Error('Cant start client due to legacy non-Fork setting.');
            }
        })
        .then(() => {
            return ClientBinaryManager.init();
        })
        .then(() => {
            return ethereumNode.init();
        })
        .then(function sanityCheck() {
            if (!ethereumNode.isIpcConnected) {
                throw new Error('Either the node didn\'t start or IPC socket failed to connect.');
            }

            /* At this point Geth is running and the socket is connected. */
            log.info('Connected via IPC to node.');

            // update menu, to show node switching possibilities
            appMenu();
        })
        .then(function getAccounts() {
            return ethereumNode.send('eth_accounts', []);
        })
        .then(function onboarding(resultData) {
            
            if (ethereumNode.isGeth && (resultData.result === null || (_.isArray(resultData.result) && resultData.result.length === 0))) {
                log.info('No accounts setup yet, lets do onboarding first.');

                return new Q((resolve, reject) => {
                    const onboardingWindow = Windows.createPopup('onboardingScreen', {
                        primary: true,
                        electronOptions: {
                            width: 576,
                            height: 442,
                        },
                    });

                    onboardingWindow.on('closed', () => {
                        app.quit();
                    });

                    // change network types (mainnet, testnet)
                    ipcMain.on('onBoarding_changeNet', (e, testnet) => {
                        const newType = ethereumNode.type;
                        const newNetwork = testnet ? 'test' : 'main';

                        log.debug('Onboarding change network', newNetwork);

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

                    if (splashWindow) {
                        splashWindow.hide();
                    }
                });
            }

            return;
        })
        .then(function doSync() {
            // we're going to do the sync - so show splash
            if (splashWindow) {
                splashWindow.show();
            }

            if (!Settings.inAutoTestMode) {
                return syncResultPromise;
            }

            return;
        })
        .then(function allDone() {
            startMainWindow();
        })
        .catch((err) => {
            log.error('Error starting up node and/or syncing', err);
        }); /* socket connected to geth */
    }; /* kick start */

    if (splashWindow) {
        splashWindow.on('ready', kickStart);
    } else {
        kickStart();
    }
}; /* onReady() */


/**
Start the main window and all its processes

@method startMainWindow
*/
startMainWindow = () => {
    log.info(`Loading Interface at ${global.interfaceAppUrl}`);

    mainWindow.on('ready', () => {
        if (splashWindow) {
            splashWindow.close();
        }

        mainWindow.show();
    });

    mainWindow.load(global.interfaceAppUrl);

    // close app, when the main window is closed
    mainWindow.on('closed', () => {
        app.quit();
    });

    // observe Tabs for changes and refresh menu
    const Tabs = global.db.getCollection('UI_tabs');

    const sortedTabs = Tabs.addDynamicView('sorted_tabs');
    sortedTabs.applySimpleSort('position', false);

    const refreshMenu = () => {
        clearTimeout(global._refreshMenuFromTabsTimer);

        global._refreshMenuFromTabsTimer = setTimeout(() => {
            log.debug('Refresh menu with tabs');

            global.webviews = sortedTabs.data();

            appMenu(global.webviews);
        }, 1000);
    };

    Tabs.on('insert', refreshMenu);
    Tabs.on('update', refreshMenu);
    Tabs.on('delete', refreshMenu);
};
