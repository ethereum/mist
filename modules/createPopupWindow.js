/**
@module popupWindow
*/
const BrowserWindow = require('browser-window');

module.exports = function(windowType, width, height, data, e){

    var modalWindow = new BrowserWindow({
        title: '',
        'always-on-top': true,
        resizable: false,
        center: true,
        width: width,
        // height: 220,
        height: 0,
        icon: global.icon,
        'standard-window': false,
        preload: __dirname +'/preloader/popupWindows.js',
        'use-content-size': true,
        'node-integration': false,
        'web-preferences': {
            'overlay-scrollbars': true,
            'text-areas-are-resizable': false,
            'web-security': false
        }
    });

    // prevent multiple openings of the same window, from the same owner
    if(e) {
        var ownerId = e.sender.getId();

        if(_.find(global.windows, function(win){ return (win.type === windowType && win.owner.getId() === ownerId); }))
            return;
    }

    // load URL
    modalWindow.loadUrl(global.interfacePopupsUrl +'#'+ windowType);

    // get window id
    var windowId = modalWindow.webContents.getId();

    modalWindow.webContents.on('did-finish-load', function() {
        modalWindow.setSize(width, height);
        modalWindow.center();

        // send data, if available
        if(data)
            modalWindow.webContents.send('data', data);
    });
    modalWindow.on('closed', function() {
        delete global.windows[windowId];
    });

    // add to windows
    global.windows[windowId] = {
        type: windowType,
        window: modalWindow,
        owner: e ? e.sender : null
    };


    return modalWindow;
};