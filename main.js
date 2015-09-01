global._ = require('underscore');
const app = require('app');  // Module to control application life.
const i18n = require('./modules/i18n.js');
const Minimongo = require('./modules/minimongoDb.js');
const syncMinimongo = require('./modules/syncMinimongo.js');


// GLOBAL Variables
global.production = false;
global.mode = 'wallet';

global.path = {
    HOME: app.getPath('home'),
    APPDATA: app.getPath('appData')
};

global.language = 'en';
global.i18n = i18n; // TODO: detect language switches somehow

global.geth = null;
global.Tabs = Minimongo('tabs');



const BrowserWindow = require('browser-window');  // Module to create native browser window.
const ipc = require('ipc');
const ipcProviderBackend = require('./modules/ipc/ipcProviderBackend.js');
const menuItems = require('./menuItems');

var mainWindow = null;
var icon = __dirname +'/icons/'+ global.mode +'/icon_128x128.png';


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



// Report crashes to our server.
require('crash-reporter').start();


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


    // kill running geth
    if(global.geth)
        global.geth.kill('SIGKILL');

    // delay quit, so the sockets can close
    setTimeout(function(){
        killedSockets = true;
        app.quit();
    }, 500);
});

// Emitted when the application is activated while there is no opened windows.
// It usually happens when a user has closed all of application's windows and then
// click on the application's dock icon.
// app.on('activate-with-no-open-windows', function () {
//     if (mainWindow) {
//         mainWindow.show();
//     }
// });


// This method will be called when Electron has done everything
// initialization and ready for creating browser windows.
app.on('ready', function() {

    // instantiate custom protocols
    // require('./customProtocols.js');



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
        mainWindow = new BrowserWindow({
            show: false,
            width: 1024 + 208,
            height: 700,
            icon: icon,
            'standard-window': false,
            preload: __dirname +'/modules/preloader/mistUI.js',
            'node-integration': false,
            'web-preferences': {
                'overlay-fullscreen-video': true,
                'webaudio': true,
                'webgl': true,
                'text-areas-are-resizable': true
            }
            // frame: false
            // 'use-content-size': true,
        });

        syncMinimongo(Tabs, mainWindow.webContents);


    // WALLET
    } else {

        mainWindow = new BrowserWindow({
            show: false,
            width: 1024,
            height: 680,
            icon: icon,
            'standard-window': false,
            preload: __dirname +'/modules/preloader/wallet.js',
            'node-integration': false,
            'web-preferences': {
                'overlay-fullscreen-video': true,
                'webaudio': true,
                'webgl': true,
                'text-areas-are-resizable': true,
                'web-security': false
                // 'overlay-scrollbars': true
            },
            // frame: false,
            // 'use-content-size': true,
        });
    }


    var appStartWindow = new BrowserWindow({
            width: 400,
            height: 200,
            icon: icon,
            'node-integration': true,
            'standard-window': false,
            frame: false
        });
    appStartWindow.loadUrl('file://' + __dirname + '/interface/startScreen/'+ global.mode +'.html');

    appStartWindow.webContents.on('did-finish-load', function() {

        // START GETH
        const spawn = require('child_process').spawn;
        const getIpcPath = require('./modules/ipc/getIpcPath.js');
        const net = require('net');
        const socket = new net.Socket();
        var ipcPath = getIpcPath();
        var intervalId;
        var count = 0;


        socket.connect({path: ipcPath});


        // try to connect
        socket.on('error', function(e){
            // console.log('Geth connection REFUSED');

            // if no geth is running, try starting your own
            if(count === 0) {
                count++;

                // START GETH
                console.log('Starting Geth...');
                appStartWindow.webContents.send('startScreenText', 'mist.startScreen.startingGeth');

                global.geth = spawn(__dirname + '/geth', [
                    // '-v', 'builds/pdf/book.html',
                    // '-o', 'builds/pdf/book.pdf'
                ]);
                // global.geth.stdout.on('data', function(chunk) {
                //     console.log('stdout',String(chunk));
                // });
                // global.geth.stderr.on('data', function(chunk) {
                //     console.log('stderr',String(chunk));
                // });


                // TRY TO CONNECT EVER 500MS
                intervalId = setInterval(function(){
                    socket.connect({path: ipcPath});
                    count++;

                    // timeout after 10 seconds
                    if(count >= 40) {
                        clearSocket(socket, intervalId, appStartWindow, ipcPath, true);
                    }
                }, 200);
            }
        });
        socket.on('connect', function(e){
            console.log('Geth connection FOUND');
            if(count === 0)
                appStartWindow.webContents.send('startScreenText', 'mist.startScreen.runningGethFound');
            else
                appStartWindow.webContents.send('startScreenText', 'mist.startScreen.startedGeth');

            clearSocket(socket, intervalId, appStartWindow, ipcPath);
            startMainWindow(mainWindow, appStartWindow);
        });
    });

});


/**
Clears the socket

@method clearSocket
*/
var clearSocket = function(socket, intervalId, appStartWindow, ipcPath, timeout){
    if(timeout) {
        appStartWindow.webContents.send('startScreenText', 'mist.startScreen.connectionTimeout', ipcPath);

        // kill running geth
        if(global.geth)
            global.geth.kill('SIGKILL');

        ipc.on('closeApp', function(event, arg) {
            app.quit();
        });
    }

    clearInterval(intervalId);
    socket.removeAllListeners();
    socket.destroy();
    socket = null;
}


/**
Start the main window and all its processes

@method startMainWindow
*/
var startMainWindow = function(mainWindow, appStartWindow){

    // and load the index.html of the app.
    if(global.production)
        mainWindow.loadUrl('file://' + __dirname + '/interface/main/index.html');
    else
        mainWindow.loadUrl('http://localhost:3000');


    mainWindow.webContents.on('did-finish-load', function() {
        mainWindow.show();
        appStartWindow.close();
        appStartWindow = null;
    });

    // Emitted when the window is closed.
    mainWindow.on('closed', function() {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });


    // STARTUP PROCESSES


    // instantiate the application menu
    // ipc.on('setupWebviewDevToolsMenu', function(e, webviews){
    Tracker.autorun(function(){
        var webviews = Tabs.find({},{sort: {position: 1}, fields: {name: 1, _id: 1}}).fetch();
        menuItems(mainWindow, webviews || []);
    });

    // instantiate the application menu
    // ipc.on('setLanguage', function(e, lang){
    //     global.language = lang;

    // });

    // initialize the IPC provider on the main window
    ipcProviderBackend(mainWindow);
};