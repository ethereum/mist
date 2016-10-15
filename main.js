"use strict";

if(require('electron-squirrel-startup')) return;

global._ = require('./modules/utils/underscore');

const Q = require('bluebird');
Q.config({
    cancellation: true,
});

const fs = require('fs');
const electron = require('electron');
const app = electron.app;
const dialog = electron.dialog;
const shell = electron.shell;
const timesync = require("os-timesync");
const syncMinimongo = require('./modules/syncMinimongo.js');
const ipc = electron.ipcMain;
const packageJson = require('./package.json');
const i18n = require('./modules/i18n.js');
const logger = require('./modules/utils/logger');
const Sockets = require('./modules/sockets');
const Windows = require('./modules/windows');
const ClientBinaryManager = require('./modules/clientBinaryManager');

const Settings = require('./modules/settings');
Settings.init();



if (Settings.cli.version) {
    console.log(Settings.appVersion);

    process.exit(0);
}

if (Settings.cli.ignoreGpuBlacklist) {
    app.commandLine.appendSwitch('ignore-gpu-blacklist', 'true');
}


// logging setup
const log = logger.create('main');


if (Settings.inAutoTestMode) {
    log.info('AUTOMATED TESTING');
}

log.info(`Running in production mode: ${Settings.inProductionMode}`);

if ('http' === Settings.rpcMode) {
    log.warn('Connecting to a node via HTTP instead of IPC. This is less secure!!!!'.toUpperCase());
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

global.icon = __dirname +'/icons/'+ Settings.uiMode +'/icon.png';
global.mode = Settings.uiMode;
global.dirname = __dirname;

global.language = 'en';
global.i18n = i18n; // TODO: detect language switches somehow



// INTERFACE PATHS
global.interfaceAppUrl;
global.interfacePopupsUrl;

// WALLET
if(Settings.uiMode === 'wallet') {
    log.info('Starting in Wallet mode');

    global.interfaceAppUrl = (Settings.inProductionMode)
        ? 'file://' + __dirname + '/interface/wallet/index.html'
        : 'http://localhost:3050';
    global.interfacePopupsUrl = (Settings.inProductionMode)
        ? 'file://' + __dirname + '/interface/index.html'
        : 'http://localhost:3000';

// MIST
} else {
    log.info('Starting in Mist mode');

    let url = (Settings.inProductionMode)
        ? 'file://' + __dirname + '/interface/index.html'
        : 'http://localhost:3000';

    if (Settings.cli.resetTabs) {
        url += '?reset-tabs=true'
    }

    global.interfaceAppUrl = global.interfacePopupsUrl = url;
}


// prevent crashed and close gracefully
process.on('uncaughtException', function(error){
    log.error('UNCAUGHT EXCEPTION', error);

    app.quit();
});



// Quit when all windows are closed.
app.on('window-all-closed', function() {
    app.quit();
});

// Listen to custom protocole incoming messages, needs registering of URL schemes
app.on('open-url', function (e, url) {
    log.info('Open URL', url);
});


var killedSocketsAndNodes = false;

app.on('before-quit', function(event){
    if(!killedSocketsAndNodes) {
        log.info('Defer quitting until sockets and node are shut down');

        event.preventDefault();

        // sockets manager
        Sockets.destroyAll()
            .catch((err) => {
                log.error('Error shutting down sockets');
            });

        // delay quit, so the sockets can close
        setTimeout(function(){
            ethereumNode.stop()
            .then(function() {
                killedSocketsAndNodes = true;

                return db.close();
            })
            .then(function() {
                app.quit(); 
            });

        }, 500);
    } else {
        log.info('About to quit...');
    }
});


var mainWindow;
var splashWindow;


// This method will be called when Electron has done everything
// initialization and ready for creating browser windows.
app.on('ready', function() {
    // if using HTTP RPC then inform user
    if ('http' === Settings.rpcMode) {
        dialog.showErrorBox('Insecure RPC connection', `
WARNING: You are connecting to an Ethereum node via: ${Settings.rpcHttpPath}

This is less secure than using local IPC - your passwords will be sent over the wire as plaintext. 

Only do this if you have secured your HTTP connection or you know what you are doing.
`);
    }

    // initialise the db
    global.db.init().then(onReady).catch((err) => {
        log.error(err);

        app.quit();
    });
});



var onReady = function() {
    // sync minimongo
    syncMinimongo.backendSync();

    // Initialise window mgr
    Windows.init();

    // check for update
    if (!Settings.inAutoTestMode) {
        require('./modules/updateChecker').run();
    }

    // initialize the web3 IPC provider backend
    ipcProviderBackend.init();

    // instantiate custom protocols
    require('./customProtocols.js');

    // add menu already here, so we have copy and past functionality
    appMenu();

    // Create the browser window.

    // MIST
    if(Settings.uiMode === 'mist') {
        mainWindow = Windows.create('main', {
            primary: true,
            electronOptions: {
                width: 1024 + 208,
                height: 720,
                webPreferences: {
                    nodeIntegration: true,
                    preload: __dirname +'/modules/preloader/mistUI.js',
                    'overlay-fullscreen-video': true,
                    'overlay-scrollbars': true
                }
            }
        });

    // WALLET
    } else {
        mainWindow = Windows.create('main', {
            primary: true,
            electronOptions: {
                width: 1100,
                height: 720,
                webPreferences: {
                    preload: __dirname +'/modules/preloader/wallet.js',
                    'overlay-fullscreen-video': true,
                    'overlay-scrollbars': true
                }
            }
        });
    }

    if (!Settings.inAutoTestMode) {
        splashWindow = Windows.create('splash', {
            primary: true,
            url: global.interfacePopupsUrl + '#splashScreen_'+ Settings.uiMode,
            show: true,
            electronOptions: {
                width: 400,
                height: 230,
                resizable: false,
                backgroundColor: '#F6F6F6',
                useContentSize: true,
                frame: false,
                webPreferences: {
                    preload: __dirname +'/modules/preloader/splashScreen.js',
                }
            }
        });
    }

    // check time sync
    // var ntpClient = require('ntp-client');
    // ntpClient.getNetworkTime("pool.ntp.org", 123, function(err, date) {
    timesync.checkEnabled(function (err, enabled) {
        if(err) {
            log.error('Couldn\'t get time from NTP time sync server.', err);
            return;
        }

        if(!enabled) {
            dialog.showMessageBox({
                type: "warning",
                buttons: ['OK'],
                message: global.i18n.t('mist.errors.timeSync.title'),
                detail: global.i18n.t('mist.errors.timeSync.description') +"\n\n"+ global.i18n.t('mist.errors.timeSync.'+ process.platform)
            }, function(){
            });
        }
    });


    const kickStart = function() {
        // client binary stuff
        ClientBinaryManager.on('status', function(status, data) {
            Windows.broadcast('uiAction_clientBinaryStatus', status, data);
        });

        // node connection stuff
        ethereumNode.on('nodeConnectionTimeout', function() {
            Windows.broadcast('uiAction_nodeStatus', 'connectionTimeout');
        });

        ethereumNode.on('nodeLog', function(data) {
            Windows.broadcast('uiAction_nodeLogText', data.replace(/^.*[0-9]\]/,''));
        });

        // state change
        ethereumNode.on('state', function(state, stateAsText) {
            Windows.broadcast('uiAction_nodeStatus', stateAsText,
                ethereumNode.STATES.ERROR === state ? ethereumNode.lastError : null
            );
        });


        // capture sync results
        const syncResultPromise = new Q((resolve, reject) => {
            nodeSync.on('nodeSyncing', function(result) {
                Windows.broadcast('uiAction_nodeSyncStatus', 'inProgress', result);
            });

            nodeSync.on('stopped', function() {
                Windows.broadcast('uiAction_nodeSyncStatus', 'stopped');
            });

            nodeSync.on('error', function(err) {
                log.error('Error syncing node', err);

                reject(err);
            });

            nodeSync.on('finished', function() {
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
                    type: "warning",
                    buttons: ['OK'],
                    message: global.i18n.t('mist.errors.legacyChain.title'),
                    detail: global.i18n.t('mist.errors.legacyChain.description')
                }, function(){
                    shell.openExternal('https://github.com/ethereum/mist/releases/0.8.2');
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
                    throw new Error('Either the node didn\'t start or IPC socket failed to connect.')
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

                if (ethereumNode.isGeth && resultData.result && resultData.result.length === 0) {
                    log.info('No accounts setup yet, lets do onboarding first.');

                    return new Q((resolve, reject) => {
                        var onboardingWindow = Windows.createPopup('onboardingScreen', {
                            primary: true,
                            electronOptions: {
                                width: 576,
                                height: 442,
                            },
                        });

                        onboardingWindow.on('close', function(){
                            app.quit();
                        });

                        // change network types (mainnet, testnet)
                        ipc.on('onBoarding_changeNet', function(e, testnet) {
                            let newType = ethereumNode.type;
                            let newNetwork = testnet ? 'test' : 'main';

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
                        ipc.on('onBoarding_launchApp', function(e) {
                            // prevent that it closes the app
                            onboardingWindow.removeAllListeners('close');
                            onboardingWindow.close();

                            ipc.removeAllListeners('onBoarding_changeNet');
                            ipc.removeAllListeners('onBoarding_launchApp');

                            resolve();
                        });

                        if (splashWindow) {
                            splashWindow.hide();
                        }
                    });
                }
            })
            .then(function doSync() {
                // we're going to do the sync - so show splash
                if (splashWindow) {
                    splashWindow.show();
                }

                if (!Settings.inAutoTestMode) {
                    return syncResultPromise;
                }
            })
            .then(function allDone() {
                startMainWindow();
            })
            .catch((err) => {
                log.error('Error starting up node and/or syncing', err);
            }); /* socket connected to geth */;

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
var startMainWindow = function() {
    log.info('Loading Interface at '+ global.interfaceAppUrl);

    mainWindow.on('ready', function() {
        if (splashWindow) {
            splashWindow.close();
        }

        mainWindow.show();
    });

    mainWindow.load(global.interfaceAppUrl);

    // close app, when the main window is closed
    mainWindow.on('closed', function() {
        app.quit();
    });

    // observe Tabs for changes and refresh menu
    const Tabs = global.db.getCollection('tabs');

    let sortedTabs = Tabs.addDynamicView('sorted_tabs');
    sortedTabs.applySimpleSort('position', false);

    let refreshMenu = function() {
        clearTimeout(global._refreshMenuFromTabsTimer);

        global._refreshMenuFromTabsTimer = setTimeout(function() {
            log.debug('Refresh menu with tabs');

            global.webviews = sortedTabs.data();

            appMenu(global.webviews);            
        }, 200);
    };

    Tabs.on('insert', refreshMenu);
    Tabs.on('update', refreshMenu);
    Tabs.on('delete', refreshMenu);
};
