const _ = require('underscore');
const app = require('app');  // Module to control application life.
const BrowserWindow = require('browser-window');  // Module to create native browser window.
const ipc = require('ipc');
const ipcProviderBackend = require('./modules/ipc/ipcProviderBackend.js');
const menuItems = require('./menuItems');



// GLOBAL Variables
global._ = _;
global.path = {
    HOME: app.getPath('home'),
    APPDATA: app.getPath('appData')
};
global.language = 'en';


// make minimongo available
require('./node_modules/minimongo-standalone/minimongo.js');



// var minimongo = require('minimongo-cache');
 
// var cache = new minimongo();
 
// cache.addCollection('users');
// console.log(cache.users);

// minimongo = require('minimongo');
// var LocalDb = minimongo.MemoryDb;
// db = new LocalDb();
 // db.addCollection("animals");
// console.log(db.animals.find().observe);

// Mongo = require('meteor-minimongo');
// console.log(Mongo());


// require('minimongo-standalone');
var test = new LocalCollection('test');
test.find().observe({added: function(doc){
    console.log(doc);
}});

Tracker.autorun(function(){
   console.log(test.findOne());
});

test.insert({
    dog: 'sheep'
});

// console.log(Tracker);

// const Menu = require('menu');
// const Tray = require('tray');
// var appIcon = null;

// const processRef = global.process;
// process.nextTick(function() { global.process = processRef; });



// Report crashes to our server.
require('crash-reporter').start();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the javascript object is GCed.
var mainWindow = null;

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    // if (process.platform != 'darwin')
    app.quit();
});


app.on('before-quit', function(){
    // CLEAR open IPC sockets to geth
    _.each(global.sockets, function(socket){
        if(socket) {
            console.log('Closing Socket ', socket.sender.getId());
            socket.destroy();
        }
    });
});

// Emitted when the application is activated while there is no opened windows.
// It usually happens when a user has closed all of application's windows and then
// click on the application's dock icon.
app.on('activate-with-no-open-windows', function () {
    if (mainWindow) {
        mainWindow.show();
    }
    return false;
});


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
    mainWindow = new BrowserWindow({
        width: 1024 + 208,
        height: 700,
        icon: './icons/icon_128x128.png',
        'standard-window': false,
        preload: __dirname +'/modules/preloader/mistUI.js',
        'node-integration': false
        // frame: false
        // 'use-content-size': true,
    });

    // and load the index.html of the app.
    // if() 'file://' + __dirname + '/interface/index.html
    mainWindow.loadUrl('http://localhost:3000');

    // Open the devtools.
    // mainWindow.openDevTools();

    // Emitted when the window is closed.
    // mainWindow.on('closed', function() {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
    //     mainWindow = null;
    // });


    // instantiate the application menu
    ipc.on('setupWebviewDevToolsMenu', function(e, webviews){
        menuItems(mainWindow, webviews || []);
    });

    // instantiate the application menu
    // ipc.on('setLanguage', function(e, lang){
    //     global.language = lang;

    // });

    // initialize the IPC provider on the main window
    ipcProviderBackend(mainWindow);

});