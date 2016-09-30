/**
Window communication

@module ipcCommunicator
*/

const electron = require('electron');
const shell = electron.shell;

const app = electron.app;  // Module to control application life.
const appMenu = require('./menuItems');
const logger = require('./utils/logger');
const Windows = require('./windows');
const ipc = electron.ipcMain;
const _ = global._;

const log = logger.create('ipcCommunicator');

require('./abi.js');
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
ipc.on('backendAction_closeApp', function() {
    app.quit();
});

ipc.on('backendAction_openExternalUrl', function(e, url) {
    shell.openExternal(url);
});

ipc.on('backendAction_closePopupWindow', function(e) {
    var windowId = e.sender.getId(),
        senderWindow = Windows.getById(windowId);

    if (senderWindow) {
        senderWindow.close();
    }
});
ipc.on('backendAction_setWindowSize', function(e, width, height) {
    var windowId = e.sender.getId(),
        senderWindow = Windows.getById(windowId);

    if (senderWindow) {
        senderWindow.window.setSize(width, height);
        senderWindow.window.center(); // ?
    }
});

ipc.on('backendAction_sendToOwner', function(e, error, value) {
    var windowId = e.sender.getId(),
        senderWindow = Windows.getById(windowId);

    var mainWindow = Windows.getByType('main');

    if (senderWindow.ownerId) {
        let ownerWindow = Windows.getById(senderWindow.ownerId);

        if (ownerWindow) {
            ownerWindow.send('windowMessage', senderWindow.type, error, value);            
        }

        if (mainWindow) {
            mainWindow.send('mistUI_windowMessage', senderWindow.type, senderWindow.ownerId, error, value);
        }
    }

});

ipc.on('backendAction_setLanguage', function(e, lang){
    if(global.language !== lang) {
        global.i18n.changeLanguage(lang.substr(0,5), function(err, t){
            if(!err) {
                global.language = global.i18n.language;
                log.info('Backend language set to: ', global.language);
                appMenu(global.webviews);
            }
        });
    }
});


// import presale file
ipc.on('backendAction_importPresaleFile', function(e, path, pw) {
    const spawn = require('child_process').spawn;
    const ClientBinaryManager = require('./clientBinaryManager');
    var error = false;
    
    const binPath = ClientBinaryManager.getClient('geth').binPath;
    
    // start import process
    var nodeProcess = spawn(binPath, ['wallet', 'import', path]);

    nodeProcess.once('error',function(){
        error = true;
        e.sender.send('uiAction_importedPresaleFile', 'Couldn\'t start the "geth wallet import <file.json>" process.');
    });
    nodeProcess.stdout.on('data', function(data) {
        var data = data.toString();
        if(data)
            log.info('Imported presale: ', data);

        if(/Decryption failed|not equal to expected addr|could not decrypt/.test(data)) {
            e.sender.send('uiAction_importedPresaleFile', 'Decryption Failed');

        // if imported, return the address
        } else if(data.indexOf('Address:') !== -1) {
            var find = data.match(/\{([a-f0-9]+)\}/i);
            if(find.length && find[1])
                e.sender.send('uiAction_importedPresaleFile', null, '0x'+ find[1]);
            else
                e.sender.send('uiAction_importedPresaleFile', data);

        // if not stop, so we don't kill the process
        } else {
            return;
        }

        nodeProcess.stdout.removeAllListeners('data');
        nodeProcess.removeAllListeners('error');
        nodeProcess.kill('SIGINT');
    });

    // file password
    setTimeout(function(){
        if(!error) {
            nodeProcess.stdin.write(pw +"\n");
            pw = null;
        }
    }, 2000);
});



var createAccountPopup = function(e){
    Windows.createPopup('requestAccount', {
        ownerId: e.sender.getId(),
        electronOptions: {
            width: 400, 
            height: 230, 
            alwaysOnTop: true,
        },
    });
};

// MIST API
ipc.on('mistAPI_createAccount', createAccountPopup);

ipc.on('mistAPI_requestAccount', function(e) {
    if (global.mode == 'wallet') {
        createAccountPopup(e);
    }
    // Mist
    else {
        Windows.createPopup('connectAccount', {
            ownerId: e.sender.getId(),
            electronOptions: {
                width: 460,
                height: 497,
                maximizable: false,
                minimizable: false,
                alwaysOnTop: true,
            },
        });
    }
});

const uiLoggers = {};

ipc.on('console_log', function(event, id, logLevel, logItemsStr) {
    try {
        let loggerId = `(ui: ${id})`;

        let windowLogger = uiLoggers[loggerId];

        if (!windowLogger) {
            windowLogger = uiLoggers[loggerId] = logger.create(loggerId);
        }

        windowLogger[logLevel].apply(windowLogger, _.toArray(JSON.parse(logItemsStr)));
    } catch (err) {
        log.error(err);
    }
});

ipc.on('backendAction_reloadSelectedTab', function(event) {
    event.sender.send('uiAction_reloadSelectedTab');
});


