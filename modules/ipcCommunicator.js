/**
Window communication

@module ipcCommunicator
*/

const app = require('app');  // Module to control application life.
const popupWindow = require('./popupWindow.js');
const ipc = require('electron').ipcMain;

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
ipc.on('backendAction_closePopupWindow', function(e) {
    var windowId = e.sender.getId();

    if(global.windows[windowId]) {
        global.windows[windowId].window.close();
        delete global.windows[windowId];
    }
});
ipc.on('backendAction_setWindowSize', function(e, width, height) {
    var windowId = e.sender.getId();

    if(global.windows[windowId]) {
        global.windows[windowId].window.setSize(width, height);
        global.windows[windowId].window.center(); // ?
    }
});

ipc.on('backendAction_sendToOwner', function(e, error, value) {
    var windowId = e.sender.getId();

    if(global.windows[windowId]) {
        global.windows[windowId].owner.send('windowMessage', global.windows[windowId].type, error, value);

    }
    if(global.mainWindow && global.mainWindow.webContents && !global.mainWindow.webContents.isDestroyed()) {
        global.mainWindow.webContents.send('mistUI_windowMessage', global.windows[windowId].type, global.windows[windowId].owner.getId(), error, value);
    }
});

// import presale file
ipc.on('backendAction_importPresaleFile', function(e, path, pw) {
    const spawn = require('child_process').spawn;
    const getNodePath = require('./getNodePath.js');
    var error = false;

    // start import process
    var nodeProcess = spawn(getNodePath('geth'), ['wallet', 'import', path]);

    nodeProcess.once('error',function(){
        error = true;
        e.sender.send('uiAction_importedPresaleFile', 'Couldn\'t start the "geth wallet import <file.json>" process.');
    });
    nodeProcess.stdout.on('data', function(data) {
        var data = data.toString();
        if(data)
            console.log('Imported presale: ', data);

        if(data.indexOf('Decryption failed:') !== -1 || data.indexOf('not equal to expected addr') !== -1) {
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




// MIST API
ipc.on('mistAPI_requestAccount', function(e){
    popupWindow.show('requestAccount', {width: 400, height: 230, alwaysOnTop: true}, null, e);
});
