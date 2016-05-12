"use strict";

global._ = require('./modules/utils/underscore');

const Q = require('bluebird');
Q.config({
    cancellation: true,
});

const fs = require('fs');
const electron = require('electron');
const app = require('app');  // Module to control application life.
const timesync = require("os-timesync");
const BrowserWindow = require('browser-window');  // Module to create native browser window.
const Minimongo = require('./modules/minimongoDb.js');
const syncMinimongo = require('./modules/syncMinimongo.js');
const ipc = electron.ipcMain;
const packageJson = require('./package.json');
const i18n = require('./modules/i18n.js');
const logger = require('./modules/utils/logger');
const Sockets = require('./modules/sockets');
const Windows = require('./modules/windows');

// CLI options
const argv = require('yargs')
    .usage('Usage: $0 [options]')
    .describe('version', 'Display app version')
    .describe('mode', 'App mode: wallet, mist (default)')
    .describe('gethpath', 'Path to geth executable to use instead of default')
    .describe('ethpath', 'Path to eth executable to use instead of default')
    .describe('ignore-gpu-blacklist', 'Ignores GPU blacklist (needed for some Linux installations)')
    .describe('reset-tabs', 'Reset Mist tabs to their default settings')
    .describe('logfile', 'Logs will be written to this file')
    .describe('loglevel', 'Minimum logging threshold: trace (all logs), debug, info (default), warn, error')
    .alias('m', 'mode')
    .help('h')
    .alias('h', 'help')
    .parse(process.argv.slice(1));

if (argv.version) {
    console.log(packageJson.version);
    process.exit(0);
}

if (argv.ignoreGpuBlacklist) {
    app.commandLine.appendSwitch('ignore-gpu-blacklist', 'true');
}

// logging setup
logger.setup(argv);
const log = logger.create('main');

// GLOBAL Variables
global.path = {
    HOME: app.getPath('home'),
    APPDATA: app.getPath('appData'), // Application Support/
    USERDATA: app.getPath('userData') // Application Aupport/Mist
};

global.appName = 'Mist';

global.production = false;

global.mode = (argv.mode ? argv.mode : 'mist');
global.paths = {
    geth: argv.gethpath,
    eth: argv.ethpath,
};

global.version = packageJson.version;
global.license = packageJson.license;


require('./modules/ipcCommunicator.js');
const appMenu = require('./modules/menuItems');
const ipcProviderBackend = require('./modules/ipc/ipcProviderBackend.js');
const popupWindow = require('./modules/popupWindow.js');
const ethereumNode = require('./modules/ethereumNode.js');
const nodeSync = require('./modules/nodeSync.js');

global.webviews = [];

global.mining = false;

global.icon = __dirname +'/icons/'+ global.mode +'/icon.png';

global.language = 'en';
global.i18n = i18n; // TODO: detect language switches somehow

global.Tabs = Minimongo('tabs');


// INTERFACE PATHS
global.interfaceAppUrl;
global.interfacePopupsUrl;

// WALLET
if(global.mode === 'wallet') {
    log.info('Starting in Wallet mode');

    global.interfaceAppUrl = (global.production)
        ? 'file://' + __dirname + '/interface/wallet/index.html'
        : 'http://localhost:3050';
    global.interfacePopupsUrl = (global.production)
        ? 'file://' + __dirname + '/interface/index.html'
        : 'http://localhost:3000';

// MIST
} else {
    log.info('Starting in Mist mode');

    let url = (global.production)
        ? 'file://' + __dirname + '/interface/index.html'
        : 'http://localhost:3000';

    if (argv.resetTabs) {
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
    // if (process.platform != 'darwin')
    app.quit();
});

// Listen to custom protocole incoming messages, needs registering of URL schemes
app.on('open-url', function (e, url) {
    log.info('Open URL', url);
});


var killedSockets = false;

app.on('before-quit', function(event){
    if(!killedSockets) {
        event.preventDefault();
    }

    // sockets manager
    Sockets.destroyAll()
        .catch((err) => {
            log.error('Error shutting down sockets');
        });

    // CLEAR open IPC sockets to geth
    _.each(global.sockets || {}, function(socket){
        if (socket) {
            log.info('Closing socket', socket.id);
            socket.destroy();
        }
    });

    // delay quit, so the sockets can close
    setTimeout(function(){
        killedSockets = true;

        ethereumNode.stop().then(function() {
            app.quit(); 
        });
    }, 500);
});




const NODE_TYPE = 'geth';


var mainWindow;
var splashWindow;


// This method will be called when Electron has done everything
// initialization and ready for creating browser windows.
app.on('ready', function() {

    // init prepared popup window
    popupWindow.loadingWindow.init();

    // initialize the IPC provider on the main window
    ipcProviderBackend();

    // instantiate custom protocols
    require('./customProtocols.js');

    // add menu already here, so we have copy and past functionality
    appMenu();

    // Create the browser window.

    // MIST
    if(global.mode === 'mist') {
        mainWindow = Windows.create('main', {
            electronOptions: {
                width: 1024 + 208,
                height: 720,
                webPreferences: {
                    preload: __dirname +'/modules/preloader/mistUI.js',
                    'overlay-fullscreen-video': true,
                    'overlay-scrollbars': true,
                }
            }
        });

        syncMinimongo(Tabs, mainWindow.webContents);

    // WALLET
    } else {
        mainWindow = Windows.create('main', {
            electronOptions: {
                width: 1100,
                height: 720,
                webPreferences: {
                    preload: __dirname +'/modules/preloader/wallet.js',
                    'overlay-fullscreen-video': true,
                    'overlay-scrollbars': true,
                }
            }
        });
    }

    splashWindow = Windows.create('splash', {
        url: global.interfacePopupsUrl + '#splashScreen_'+ global.mode,
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


    splashWindow.on('content-loaded', function() {
        // node connection stuff
        ethereumNode.on('nodeConnectionTimeout', function() {
            Windows.broadcast('nodeStatus', 'connectionTimeout');
        });

        ethereumNode.on('nodeLog', function(data) {
            Windows.broadcast('nodeLogText', data.replace(/^.*[0-9]\]/,''));
        });

        // state change
        ethereumNode.on('state', function(state, stateAsText) {
            Windows.broadcast('nodeStatus', stateAsText);
            popupWindow.send('nodeStatus', stateAsText);
        });


        // capture sync results
        const syncResultPromise = new Q((resolve, reject) => {
            nodeSync.on('peerSearchTimeoutClear', function() {
                Windows.broadcast('nodeSyncStatus', 'peerSearchTimeoutClear');
            });

            nodeSync.on('peerSearchTimeout', function() {
                Windows.broadcast('nodeSyncStatus', 'peerSearchTimeout');
            });

            nodeSync.on('nodeSyncing', function(result) {
                Windows.broadcast('nodeSyncStatus', 'inProgress', result);
                popupWindow.send('nodeSyncStatus', 'inProgress', result);
            });

            nodeSync.on('stopped', function() {
                Windows.broadcast('nodeSyncStatus', 'stopped');
                popupWindow.send('nodeSyncStatus', 'stopped');
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

        // go!
        ethereumNode.init()
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
            .then(function onboarding(result) {
                if (ethereumNode.isGeth && result && result.length === 0) {
                    log.info('No accounts setup yet, lets do onboarding first.');

                    return new Q((resolve, reject) => {
                        splashWindow.hide();

                        var onboardingWindow = popupWindow.show('onboardingScreen', {width: 576, height: 442});

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
                    });
                }
            })
            .then(function doSync() {
                // we're going to do the sync - so show splash
                splashWindow.show();

                return syncResultPromise;
            })
            .then(function allDone() {
                startMainWindow();
            })
            .catch((err) => {
                log.error('Error starting up node and/or syncing', err);

                app.quit();
            }); /* socket connected to geth */;

    }); /* on splash screen loaded */

}); /* on app ready */




/**
Start the main window and all its processes

@method startMainWindow
*/
var startMainWindow = function() {
    log.info('Loading Interface at '+ global.interfaceAppUrl);

    mainWindow.on('content-loaded', function() {
        splashWindow.close();
        popupWindow.loadingWindow.hide();

        mainWindow.show();
    });

    mainWindow.load(global.interfaceAppUrl);

    // close app, when the main window is closed
    mainWindow.on('closed', function() {
        app.quit();
    });

    // instantiate the application menu
    Tracker.autorun(function(){
        global.webviews = Tabs.find({},{sort: {position: 1}, fields: {name: 1, _id: 1}}).fetch();
        appMenu(global.webviews);
    });
};


