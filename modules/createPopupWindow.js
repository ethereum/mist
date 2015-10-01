/**
@module popupWindow
*/
const BrowserWindow = require('browser-window');

module.exports = {
    loadingwindow: null,
    initLoadingWindow: function(){
        var _this = this;

        this.loadingwindow = new BrowserWindow({
            title: '',
            'always-on-top': true,
            resizable: false,
            width: 100,
            height: 50,
            center: true,
            show: false,
            icon: global.icon,
            'use-content-size': true,
            frame: false,
            'use-content-size': true,
            'node-integration': false,
            'web-preferences': {
                'overlay-scrollbars': true,
                'web-security': false
            }
        });
        this.loadingwindow.on('closed', function() {
            _this.loadingwindow = null;
        });
        // load URL
        this.loadingwindow.loadUrl(global.interfacePopupsUrl +'#loadingWindow');
    },
    show: function(windowType, width, height, data, e){
        var _this = this;

        this.loadingwindow.center();
        this.loadingwindow.show();

        var modalWindow = new BrowserWindow({
            title: '',
            'always-on-top': true,
            resizable: false,
            width: width,
            height: height,
            center: true,
            show: false,
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
        // modalWindow.setSize(width, 0);
        // modalWindow.show();

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

        modalWindow.webContents.on('dom-ready', function() {
            // send data, if available
            if(data)
                modalWindow.webContents.send('data', data);
        });
        modalWindow.webContents.on('did-finish-load', function() {
            _this.loadingwindow.hide();
            modalWindow.show();
        });
        modalWindow.on('closed', function() {
            delete global.windows[windowId];
            modalWindow = null;
        });

        // add to windows
        global.windows[windowId] = {
            type: windowType,
            window: modalWindow,
            owner: e ? e.sender : null
        };

        return modalWindow;
    }
};