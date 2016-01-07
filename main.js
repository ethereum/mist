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
    APPDATA: app.getPath('appData'),
    USERDATA: app.getPath('userData')
};

const ipcProviderBackend = require('./modules/ipc/ipcProviderBackend.js');
const NodeConnector = require('./modules/ipc/nodeConnector.js');
const createPopupWindow = require('./modules/createPopupWindow.js');
const ethereumNodes = require('./modules/ethereumNodes.js');
const getIpcPath = require('./modules/ipc/getIpcPath.js');
const ghdownload = require('github-download')

var ipcPath = getIpcPath();


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
    app.quit();
});

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    // if (process.platform != 'darwin')
    app.quit();
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
        ethereumNodes.stopNodes();
        app.quit();
    }, 500);
});



/*

// windows including webviews
windows = {
    23: {
        type: 'requestWindow',
        window: obj,
        owner: 12
    },
    12: {
        type: 'webview'
        window: obj
        owner: null
    }
}

*/

// UI ACTIONS
ipc.on('uiAction_closeApp', function() {
    app.quit();
});
ipc.on('uiAction_closePopupWindow', function(e) {
    var windowId = e.sender.getId();

    if(global.windows[windowId]) {
        global.windows[windowId].window.close();
        delete global.windows[windowId];
    }
});
ipc.on('uiAction_setWindowSize', function(e, width, height) {
    var windowId = e.sender.getId();

    if(global.windows[windowId]) {
        global.windows[windowId].window.setSize(width, height);
        global.windows[windowId].window.center(); // ?
    }
});

ipc.on('uiAction_sendToOwner', function(e, error, value) {
    var windowId = e.sender.getId();

    if(global.windows[windowId]) {
        global.windows[windowId].owner.send('windowMessage', global.windows[windowId].type, error, value);
        global.mainWindow.webContents.send('mistUI_windowMessage', global.windows[windowId].type, global.windows[windowId].owner.getId(), error, value);
    }
});

	
// MIST API
ipc.on('mistAPI_requestAccount', function(e){
    createPopupWindow.show('requestAccount', 400, 210, null, e);
});

ipc.on("installFromGit", function(e, options) {
    var packagesHome = global.path.USERDATA + '\\Applications\\';
    var packageName = options.url.substr(options.url.lastIndexOf("/")+1);
    var packageRoot = packagesHome + packageName;
    var accessUrl = 'file://'+ packageRoot + "/index.html";
	var hasError = false;

	try {
		ghdownload(options.url, packageRoot)
			.on("error", function(error) {
				console.log("git install error: " + error);
				global.mainWindow.webContents.send('installedFromGit',
					{
						url: options.url,
						success: false,
						message: error.toString()

					});
				hasError = true;
			})
			.on("end", function() {
				if (hasError)
					return;
				
				global.mainWindow.webContents.send('installedFromGit',
					{
						name: packageName,
						url: accessUrl,
						success: true
					});
			})
	}
	catch(error) {
		console.log("git install error: " + error);
		global.mainWindow.webContents.send('installedFromGit',
			{
				url: options.url,
				success: false,
				message: error.toString()

			});
		hasError = true;		
	}


});




// Emitted when the application is activated while there is no opened windows.
// It usually happens when a user has closed all of application's windows and then
// click on the application's dock icon.
// app.on('activate-with-no-open-windows', function () {
//     if (global.mainWindow) {
//         global.mainWindow.show();
//     }
// });



// This method will be called when Electron has done everything
// initialization and ready for creating browser windows.
app.on('ready', function() {

    // init prepared popup window
    createPopupWindow.initLoadingWindow();

    // instantiate custom protocols
    // require('./customProtocols.js');

    // add menu already her, so we have copy and past functionality
    appMenu([]);

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
            show: false,
            width: 1024 + 208,
            height: 700,
            icon: global.icon,
            'standard-window': false,
            'dark-theme': true,
            'accept-first-mouse': true,
            preload: __dirname +'/modules/preloader/mistUI.js',
            'node-integration': false,
            'web-preferences': {
                'overlay-scrollbars': true,
                'webaudio': true,
                'webgl': true,
                'text-areas-are-resizable': true,
                'web-security': false // necessary to make routing work on file:// protocol
            }
        });

        syncMinimongo(Tabs, global.mainWindow.webContents);


    // WALLET
    } else {

        global.mainWindow = new BrowserWindow({
            show: false,
            width: 1024,
            height: 680,
            icon: global.icon,
            'standard-window': false,
            'dark-theme': true,
            'accept-first-mouse': true,
            preload: __dirname +'/modules/preloader/wallet.js',
            'node-integration': false,
            'web-preferences': {
                'overlay-fullscreen-video': true,
                'overlay-scrollbars': true,
                'webaudio': true,
                'webgl': true,
                'text-areas-are-resizable': true,
                'web-security': false // necessary to make routing work on file:// protocol
            }
        });
    }


    var appStartWindow = new BrowserWindow({
            width: 400,
            height: 230,
            icon: global.icon,
            resizable: false,
            'node-integration': false,
            preload: __dirname +'/modules/preloader/splashScreen.js',
            'standard-window': false,
            'use-content-size': true,
            frame: false,
            'web-preferences': {
                'web-security': false // necessary to make routing work on file:// protocol
            }
        });
    appStartWindow.loadURL(global.interfacePopupsUrl + '#splashScreen_'+ global.mode);//'file://' + __dirname + '/interface/startScreen/'+ global.mode +'.html');
    // appStartWindow.openDevTools();


    appStartWindow.webContents.on('did-finish-load', function() {

        // START GETH
        const checkNodeSync = require('./modules/checkNodeSync.js');
        const net = require('net');
        const socket = new net.Socket();
        var intervalId;
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

                var node = ethereumNodes.startNode(nodeType, (global.network === 'test'), function(e){
                    // TRY TO CONNECT EVER 500MS
                    if(!e) {
                        intervalId = setInterval(function(){
                            socket.connect({path: ipcPath});
                            count++;

                            // timeout after 10 seconds
                            if(count >= 60) {

                                if(appStartWindow && appStartWindow.webContents)
                                    appStartWindow.webContents.send('startScreenText', 'mist.startScreen.nodeConnectionTimeout', ipcPath);

                                clearInterval(intervalId);

                                clearSocket(socket, true);
                            }
                        }, 200);


                    // NO Binary
                    } else {

                        if(appStartWindow && appStartWindow.webContents) {
                            appStartWindow.webContents.send('startScreenText', 'mist.startScreen.nodeBinaryNotFound');
                        }

                        clearInterval(intervalId);

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
            appMenu([]);

            checkNodeSync(appStartWindow, function(e){

                appStartWindow.webContents.send('startScreenText', 'mist.startScreen.startedNode');
                clearSocket(socket);
                startMainWindow(appStartWindow);
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

    // initialize the IPC provider on the main window
    ipcProviderBackend();
};