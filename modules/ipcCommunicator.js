/**
Window communication

@module ipcCommunicator
*/

const _ = global._;
const { app, ipcMain: ipc, shell } = require('electron');
const Windows = require('./windows');
const logger = require('./utils/logger');
const appMenu = require('./menuItems');

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
ipc.on('backendAction_closeApp', () => {
    app.quit();
});

ipc.on('backendAction_openExternalUrl', (e, url) => {
    shell.openExternal(url);
});

ipc.on('backendAction_closePopupWindow', (e) => {
    let windowId = e.sender.getId(),
        senderWindow = Windows.getById(windowId);

    if (senderWindow) {
        senderWindow.close();
    }
});
ipc.on('backendAction_setWindowSize', (e, width, height) => {
    let windowId = e.sender.getId(),
        senderWindow = Windows.getById(windowId);

    if (senderWindow) {
        senderWindow.window.setSize(width, height);
        senderWindow.window.center(); // ?
    }
});

ipc.on('backendAction_sendToOwner', (e, error, value) => {
    let windowId = e.sender.getId(),
        senderWindow = Windows.getById(windowId);

    const mainWindow = Windows.getByType('main');

    if (senderWindow.ownerId) {
        const ownerWindow = Windows.getById(senderWindow.ownerId);

        if (ownerWindow) {
            ownerWindow.send('windowMessage', senderWindow.type, error, value);
        }

        if (mainWindow) {
            mainWindow.send('uiAction_windowMessage', senderWindow.type, senderWindow.ownerId, error, value);
        }
    }
});

ipc.on('backendAction_setLanguage', (e, lang) => {
    if (global.language !== lang) {
        global.i18n.changeLanguage(lang.substr(0, 5), (err, t) => {
            if (!err) {
                global.language = global.i18n.language;
                log.info('Backend language set to: ', global.language);
                appMenu(global.webviews);
            }
        });
    }
});


// import presale file
ipc.on('backendAction_importPresaleFile', (e, path, pw) => {
    const spawn = require('child_process').spawn;
    const ClientBinaryManager = require('./clientBinaryManager');
    let error = false;

    const binPath = ClientBinaryManager.getClient('geth').binPath;

    // start import process
    const nodeProcess = spawn(binPath, ['wallet', 'import', path]);

    nodeProcess.once('error', () => {
        error = true;
        e.sender.send('uiAction_importedPresaleFile', 'Couldn\'t start the "geth wallet import <file.json>" process.');
    });
    nodeProcess.stdout.on('data', (data) => {
        var data = data.toString();
        if (data)
            { log.info('Imported presale: ', data); }

        if (/Decryption failed|not equal to expected addr|could not decrypt/.test(data)) {
            e.sender.send('uiAction_importedPresaleFile', 'Decryption Failed');

        // if imported, return the address
        } else if (data.indexOf('Address:') !== -1) {
            const find = data.match(/\{([a-f0-9]+)\}/i);
            if (find.length && find[1])
                { e.sender.send('uiAction_importedPresaleFile', null, `0x${find[1]}`); }
            else
                { e.sender.send('uiAction_importedPresaleFile', data); }

        // if not stop, so we don't kill the process
        } else {
            return;
        }

        nodeProcess.stdout.removeAllListeners('data');
        nodeProcess.removeAllListeners('error');
        nodeProcess.kill('SIGINT');
    });

    // file password
    setTimeout(() => {
        if (!error) {
            nodeProcess.stdin.write(`${pw}\n`);
            pw = null;
        }
    }, 2000);
});


const createAccountPopup = function (e) {
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

ipc.on('mistAPI_requestAccount', (e) => {
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

ipc.on('console_log', (event, id, logLevel, logItemsStr) => {
    try {
        const loggerId = `(ui: ${id})`;

        let windowLogger = uiLoggers[loggerId];

        if (!windowLogger) {
            windowLogger = uiLoggers[loggerId] = logger.create(loggerId);
        }

        windowLogger[logLevel](..._.toArray(JSON.parse(logItemsStr)));
    } catch (err) {
        log.error(err);
    }
});

ipc.on('backendAction_reloadSelectedTab', (event) => {
    event.sender.send('uiAction_reloadSelectedTab');
});
