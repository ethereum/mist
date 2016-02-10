/**
Window communication

@module ipcCommunicator
*/

const app = require('app');  // Module to control application life.
const createPopupWindow = require('./createPopupWindow.js');
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
    createPopupWindow.show('requestAccount', 400, 230, null, e);
});
