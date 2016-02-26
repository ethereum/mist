global._ = require('underscore');
const fs = require('fs');
const electron = require('electron');
const app = require('app');  // Module to control application life.
const appMenu = require('./modules/menuItems');
const BrowserWindow = require('browser-window');  // Module to create native browser window.
const i18n = require('./modules/i18n.js');
const Minimongo = require('./modules/minimongoDb.js');
const syncMinimongo = require('./modules/syncMinimongo.js');
const ipc = electron.ipcMain;


// GLOBAL Variables
global.path = {
    HOME: app.getPath('home'),
    APPDATA: app.getPath('appData'), // Application Support/
    USERDATA: app.getPath('userData') // Application Aupport/Mist
};

require('./modules/ipcCommunicator.js');
const ipcProviderBackend = require('./modules/ipc/ipcProviderBackend.js');
const NodeConnector = require('./modules/ipc/nodeConnector.js');
const popupWindow = require('./modules/popupWindow.js');
const ethereumNodes = require('./modules/ethereumNodes.js');
const getIpcPath = require('./modules/ipc/getIpcPath.js');
var ipcPath = getIpcPath();

global.appName = 'Mist';

global.production = false;
global.mode = 'mist';

global.mainWindow = null;
global.windows = {};

global.nodes = {
    geth: null,
    eth: null
};
global.network = 'main'; // or 'test', will be set by the file later
global.mining = false;

global.icon = __dirname +'/icons/'+ global.mode +'/icon.png';

global.language = 'en';
global.i18n = i18n; // TODO: detect language switches somehow

global.Tabs = Minimongo('tabs');
global.nodeConnector = new NodeConnector(ipcPath);


// INTERFACE PATHS
global.interfaceAppUrl;
global.interfacePopupsUrl;

// WALLET
if(global.mode === 'wallet') {
    global.interfaceAppUrl = (global.production)
        ? 'file://' + __dirname + '/interface/wallet/index.html'
        : 'http://localhost:3050';
    global.interfacePopupsUrl = (global.production)
        ? 'file://' + __dirname + '/interface/index.html'
        : 'http://localhost:3000';

// MIST
} else {
    global.interfaceAppUrl = global.interfacePopupsUrl = (global.production)
        ? 'file://' + __dirname + '/interface/index.html'
        : 'http://localhost:3000';
}


// const getCurrentKeyboardLayout = require('keyboard-layout');
// const etcKeyboard = require('etc-keyboard');
// console.log(getCurrentKeyboardLayout());
// etcKeyboard(function (err, layout) {
//     console.log('KEYBOARD:', layout);
// });


// const Menu = require('menu');
// const Tray = require('tray');
// var appIcon = null;



// const processRef = global.process;
// process.nextTick(function() { global.process = processRef; });


// prevent crashed and close gracefully
process.on('uncaughtException', function(error){
    console.log('UNCAUGHT EXCEPTION', error);
    // var stack = new Error().stack;
    // console.log(stack);

    app.quit();
});

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    // if (process.platform != 'darwin')
    app.quit();
});

// Listen to custom protocole incoming messages, needs registering of URL schemes
app.on('open-url', function (e, url) {
    console.log('Open URL', url);
});


// app.on('will-quit', function(event){
//     event.preventDefault()
// });

var killedSockets = false;
app.on('before-quit', function(event){
    if(!killedSockets)
        event.preventDefault();

    // CLEAR open IPC sockets to geth
    _.each(global.sockets, function(socket){
        if(socket) {
            console.log('Closing Socket ', socket.id);
            socket.destroy();
        }
    });


    // delay quit, so the sockets can close
    setTimeout(function(){
        killedSockets = true;
        ethereumNodes.stopNodes(function(){
            app.quit();
        });
    }, 500);
});


// Emitted when the application is activated while there is no opened windows.
// It usually happens when a user has closed all of application's windows and then
// click on the application's dock icon.
// app.on('activate-with-no-open-windows', function () {
//     if (global.mainWindow) {
//         global.mainWindow.show();
//     }
// });


// append ignore GPU blacklist on linux
// if(process.platform === 'freebsd' ||
//    process.platform === 'linux' ||
//    process.platform === 'sunos') {
//     app.commandLine.appendSwitch('ignore-cpu-blacklist');
// }


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

    // appIcon = new Tray('./icons/icon-tray.png');
    // var contextMenu = Menu.buildFromTemplate([
    //     { label: 'Item1', type: 'radio' },
    //     { label: 'Item2', type: 'radio' },
    //     { label: 'Item3', type: 'radio', checked: true },
    //     { label: 'Item4', type: 'radio' },
    // ]);
    // appIcon.setToolTip('This is my application.');
    // appIcon.setContextMenu(contextMenu);


    // Create the browser window.

    // MIST
    if(global.mode === 'mist') {
        global.mainWindow = new BrowserWindow({
            title: global.appName,
            show: false,
            width: 1024 + 208,
            height: 700,
            icon: global.icon,
            titleBarStyle: 'hidden-inset', //hidden-inset: more space
            backgroundColor: '#D2D2D2',
            acceptFirstMouse: true,
            darkTheme: true,
            webPreferences: {
                preload: __dirname +'/modules/preloader/mistUI.js',
                nodeIntegration: false,
                'overlay-scrollbars': true,
                webaudio: true,
                webgl: false,
                textAreasAreResizable: true,
                webSecurity: false // necessary to make routing work on file:// protocol
            }
        });

        syncMinimongo(Tabs, global.mainWindow.webContents);


    // WALLET
    } else {

        global.mainWindow = new BrowserWindow({
            title: global.appName,
            show: false,
            width: 1024,
            height: 680,
            icon: global.icon,
            titleBarStyle: 'hidden-inset', //hidden-inset: more space
            backgroundColor: '#F6F6F6',
            acceptFirstMouse: true,
            darkTheme: true,
            webPreferences: {
                preload: __dirname +'/modules/preloader/wallet.js',
                nodeIntegration: false,
                'overlay-fullscreen-video': true,
                'overlay-scrollbars': true,
                webaudio: true,
                webgl: false,
                textAreasAreResizable: true,
                webSecurity: false // necessary to make routing work on file:// protocol
            }
        });
    }

    var appStartWindow = new BrowserWindow({
            title: global.appName,
            width: 400,
            height: 230,
            icon: global.icon,
            resizable: false,
            backgroundColor: '#F6F6F6',
            useContentSize: true,
            frame: false,
            webPreferences: {
                preload: __dirname +'/modules/preloader/splashScreen.js',
                nodeIntegration: false,
                webSecurity: false // necessary to make routing work on file:// protocol
            }
        });
    appStartWindow.loadURL(global.interfacePopupsUrl + '#splashScreen_'+ global.mode);//'file://' + __dirname + '/interface/startScreen/'+ global.mode +'.html');


    appStartWindow.webContents.on('did-finish-load', function() {


        // START GETH
        const checkNodeSync = require('./modules/checkNodeSync.js');
        const net = require('net');
        const socket = new net.Socket();
        var intervalId = null;
        var count = 0;


        // TRY to CONNECT
        setTimeout(function(){
            socket.connect({path: ipcPath});
        }, 1);

        // try to connect
        socket.on('error', function(e){
            // console.log('Geth connection REFUSED', count);

            // if no geth is running, try starting your own
            if(count === 0) {
                count++;

                // STARTING NODE
                if(appStartWindow && appStartWindow.webContents)
                    appStartWindow.webContents.send('startScreenText', 'mist.startScreen.startingNode');

                // read which node is used on this machine
                var nodeType = 'geth';

                try {
                    nodeType = fs.readFileSync(global.path.USERDATA + '/node', {encoding: 'utf8'});
                } catch(e){
                }
                try {
                    global.network = fs.readFileSync(global.path.USERDATA + '/network', {encoding: 'utf8'});
                } catch(e){
                }
                console.log('Node type: ', nodeType);
                console.log('Network: ', global.network);

                // If nothing else happens, show an error message in 60 seconds
                var startingTimeout = setTimeout(function(){ 
                    appStartWindow.webContents.send('startScreenText', 'mist.startScreen.nodeNotStarted');
                }, 60000);

                var node = ethereumNodes.startNode(nodeType, (global.network === 'test'), function(e){
                    clearInterval(intervalId);

                    // TRY TO CONNECT EVERY 500MS
                    if(!e) {
                        intervalId = setInterval(function(){
                            if(socket)
                                socket.connect({path: ipcPath});
                            count++;

                            // timeout after 10 seconds
                            if(count >= 60) {
                                clearTimeout(startingTimeout);

                                if(appStartWindow && appStartWindow.webContents && !appStartWindow.webContents.isDestroyed())
                                    appStartWindow.webContents.send('startScreenText', 'mist.startScreen.nodeConnectionTimeout', ipcPath);

                                clearInterval(intervalId);

                                clearSocket(socket, true);
                            }
                        }, 200);


                    // NO Binary
                    } else {

                        if(appStartWindow && appStartWindow.webContents) {
                            clearTimeout(startingTimeout);
                            appStartWindow.webContents.send('startScreenText', 'mist.startScreen.nodeBinaryNotFound');
                        }

                        clearSocket(socket, true);
                    }
                });
            }
        });
        socket.on('connect', function(data){
            console.log('Geth connection FOUND');
            if(appStartWindow && appStartWindow.webContents) {
                if(count === 0)
                    appStartWindow.webContents.send('startScreenText', 'mist.startScreen.runningNodeFound');
                else
                    appStartWindow.webContents.send('startScreenText', 'mist.startScreen.startedNode');
            }

            clearInterval(intervalId);

            // update menu, to show node switching possibilities
            appMenu();

            checkNodeSync(appStartWindow,
            // -> callback splash screen finished
            function(e){

                appStartWindow.webContents.send('startScreenText', 'mist.startScreen.startedNode');
                clearSocket(socket);
                startMainWindow(appStartWindow);

            // -> callback onboarding
            }, function(){

                if(appStartWindow)
                    appStartWindow.close();
                appStartWindow = null;

                var onboardingWindow = popupWindow.show('onboardingScreen', {width: 576, height: 442});
                // onboardingWindow.openDevTools();
                onboardingWindow.on('close', function(){
                    app.quit();
                });

                // change network types (mainnet, testnet)
                ipc.on('onBoarding_changeNet', function(e, testnet) {
                    var geth = !!global.nodes.geth;

                    ethereumNodes.stopNodes(function(){
                        ethereumNodes.startNode(geth ? 'geth' : 'eth', testnet, function(){
                            console.log('Changed to ', (testnet ? 'testnet' : 'mainnet'));
                            appMenu();
                        });
                    });
                });
                // launch app
                ipc.on('onBoarding_launchApp', function(e) {
                    clearSocket(socket);

                    // prevent that it closes the app
                    onboardingWindow.removeAllListeners('close');
                    onboardingWindow.close();
                    onboardingWindow = null;

                    popupWindow.loadingWindow.show();

                    ipc.removeAllListeners('onBoarding_changeNet');
                    ipc.removeAllListeners('onBoarding_importPresaleFile');
                    ipc.removeAllListeners('onBoarding_launchApp');

                    startMainWindow(appStartWindow);
                });

            });
        });
    });

});


/**
Clears the socket

@method clearSocket
*/
var clearSocket = function(socket, timeout){
    if(timeout) {
        ethereumNodes.stopNodes();
    }

    socket.removeAllListeners();
    socket.destroy();
    socket = null;
}


/**
Start the main window and all its processes

@method startMainWindow
*/
var startMainWindow = function(appStartWindow){

    // and load the index.html of the app.
    console.log('Loading Interface at '+ global.interfaceAppUrl);
    global.mainWindow.loadURL(global.interfaceAppUrl); // 'file:///Users/frozeman/Sites/_ethereum/meteor-dapp-wallet/build/index.html'

    global.mainWindow.webContents.on('did-finish-load', function() {
        popupWindow.loadingWindow.hide();

        global.mainWindow.show();
        // global.mainWindow.center();

        if(appStartWindow)
            appStartWindow.close();
        appStartWindow = null;
    });

    // close app, when the main window is closed
    global.mainWindow.on('closed', function() {
        global.mainWindow = null;

        app.quit();
    });


    // STARTUP PROCESSES


    // instantiate the application menu
    // ipc.on('setupWebviewDevToolsMenu', function(e, webviews){
    Tracker.autorun(function(){
        var webviews = Tabs.find({},{sort: {position: 1}, fields: {name: 1, _id: 1}}).fetch();
        appMenu(webviews || []);
    });

    // instantiate the application menu
    // ipc.on('setLanguage', function(e, lang){
    //     global.language = lang;

    // });
};