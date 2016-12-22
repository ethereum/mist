/**
Window communication

@module ipcCommunicator
*/

const _ = global._;
const fs = require('fs');
const { app, ipcMain: ipc, shell, webContents } = require('electron');
const Windows = require('./windows');
const logger = require('./utils/logger');
const appMenu = require('./menuItems');
const Settings = require('./settings');
const ethereumNode = require('./ethereumNode.js');
const keyfileRecognizer = require('ethereum-keyfile-recognizer');

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
    const windowId = e.sender.id;
    const senderWindow = Windows.getById(windowId);

    if (senderWindow) {
        senderWindow.close();
    }
});
ipc.on('backendAction_setWindowSize', (e, width, height) => {
    const windowId = e.sender.id;
    const senderWindow = Windows.getById(windowId);

    if (senderWindow) {
        senderWindow.window.setSize(width, height);
        senderWindow.window.center(); // ?
    }
});

ipc.on('backendAction_windowCallback', (e, value1, value2, value3) => {
    const windowId = e.sender.id;
    const senderWindow = Windows.getById(windowId);

    if (senderWindow.callback) {
        senderWindow.callback(value1, value2, value3);
    }
});

ipc.on('backendAction_windowMessageToOwner', (e, error, value) => {
    const windowId = e.sender.id;
    const senderWindow = Windows.getById(windowId);

    if (senderWindow.ownerId) {
        const ownerWindow = Windows.getById(senderWindow.ownerId);
        const mainWindow = Windows.getByType('main');

        if (ownerWindow) {
            ownerWindow.send('uiAction_windowMessage', senderWindow.type, error, value);
        }

        // send through the mainWindow to the webviews
        if (mainWindow) {
            mainWindow.send('uiAction_windowMessage', senderWindow.type, senderWindow.ownerId, error, value);
        }
    }
});

ipc.on('backendAction_setLanguage', (e, lang) => {
    if (global.language !== lang) {
        global.i18n.changeLanguage(lang.substr(0, 5), (err) => {
            if (!err) {
                global.language = global.i18n.language;
                log.info('Backend language set to: ', global.language);
                appMenu(global.webviews);
            }
        });
    }
});

ipc.on('backendAction_stopWebviewNavigation', (e, id) => {
    console.log('webcontent ID', id);
    const webContent = webContents.fromId(id);

    if (webContent && !webContent.isDestroyed()) {
        webContent.stop();
    }

    e.returnValue = true;
});

// check wallet file type
ipc.on('backendAction_checkWalletFile', (e, path) => {
    fs.readFile(path, 'utf8', (event, data) => {
        if (!event) {
            try {
                const wallet = JSON.parse(data);
                const result = keyfileRecognizer(wallet);

                if (result[0] === 'ethersale') {
                    e.sender.send('uiAction_checkedWalletFile', null, 'presale');
                } else if (result[0] === 'web3') {
                    e.sender.send('uiAction_checkedWalletFile', null, 'web3');

                    let keystorePath = Settings.userHomePath;
                    // eth
                    if (ethereumNode.isEth) {
                        if (process.platform === 'win32') {
                            keystorePath = `${Settings.appDataPath}\\Web3\\keys`;
                        } else {
                            keystorePath += '/.web3/keys';
                        }

                        // geth
                    } else {
                        if (process.platform === 'darwin') keystorePath += '/Library/Ethereum/keystore';

                        if (process.platform === 'freebsd' ||
                            process.platform === 'linux' ||
                            process.platform === 'sunos') keystorePath += '/.ethereum/keystore';

                        if (process.platform === 'win32') keystorePath = `${Settings.appDataPath}\\Ethereum\\keystore`;
                    }
                    // TODO write async, naming
                    fs.writeFileSync(`${keystorePath}/0x${wallet.address}`, data);
                } else {
                    log.warn('Wallet import: Cannot recognize format');
                }
            } catch (err) {
                log.error('Wallet import: Cannot parse file, no valid json');
                log.error(err);
                // TODO UI feedback
            }
        }
    });
});


// import presale wallet
// TODO naming
ipc.on('backendAction_importWalletFile', (e, path, pw) => {
    const spawn = require('child_process').spawn;
    const ClientBinaryManager = require('./clientBinaryManager');
    let error = false;

    const binPath = ClientBinaryManager.getClient('geth').binPath;

    // start import process
    fs.readFile(path, 'utf8', (e, data) => {
        if (!e) {
            try {
                let wallet = JSON.parse(data);
            } catch (err) {
                log.error('Wallet import: Cannot read file');
                log.error(err);
            }

            if (data.indexOf('"ethaddr"') !== -1) {  // Presale wallet
                console.info('presale');
            } else if (data.indexOf('"address"') !== -1) {  // web3 secret storage wallet
                console.info('myether');
            } else {
                log.warn('Wallet import: Cannot recognize format');
            }
        }
    });

    return false;  // temporary stopper

/*    var nodeProcess = spawn(getNodePath('geth'), ['wallet', 'import', path]);

    nodeProcess.once('error', () => {
        error = true;
        e.sender.send('uiAction_importedWalletFile', 'Couldn\'t start the "geth wallet import <file.json>" process.');
    });
    nodeProcess.stdout.on('data', (data) => {
        var data = data.toString();
        if (data) {
            log.info('Imported presale: ', data);
        }

        if (/Decryption failed|not equal to expected addr|could not decrypt/.test(data)) {
            e.sender.send('uiAction_importedWalletFile', 'Decryption Failed');

            // if imported, return the address
        } else if (data.indexOf('Address:') !== -1) {
            var find = data.match(/\{([a-f0-9]+)\}/i);
            if (find.length && find[1])
                e.sender.send('uiAction_importedWalletFile', null, '0x' + find[1]);
            else
                e.sender.send('uiAction_importedWalletFile', data);

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
    }, 2000);*/
});


const createAccountPopup = (e) => {
    Windows.createPopup('requestAccount', {
        ownerId: e.sender.id,
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
    if (global.mode === 'wallet') {
        createAccountPopup(e);
    } else { // Mist
        Windows.createPopup('connectAccount', {
            ownerId: e.sender.id,
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
