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
            alwaysOnTop: true,
            resizable: false,
            width: 100,
            height: 50,
            center: true,
            show: false,
            icon: global.icon,
            frame: false,
            useContentSize: true,
            titleBarStyle: 'hidden', //hidden-inset: more space
            acceptFirstMouse: true,
            darkTheme: true,
            webPreferences: {
                nodeIntegration: false,
                webgl: false,
                webSecurity: false
            }
        });
        this.loadingwindow.on('closed', function() {
            _this.loadingwindow = null;
        });
        // load URL
        this.loadingwindow.loadURL(global.interfacePopupsUrl +'#loadingWindow');
    },
    show: function(windowType, options, data, e, noWeb3){
        var _this = this;

        this.loadingwindow.center();
        this.loadingwindow.show();

        options = {
            title: '',
            alwaysOnTop: !!options.alwaysOnTop,
            resizable: !!options.alwaysOnTop,
            width: options.width,
            height: options.height,
            center: true,
            show: false,
            icon: global.icon,
            useContentSize: true,
            titleBarStyle: 'hidden', //hidden-inset: more space
            webPreferences: {
                preload: noWeb3 ? __dirname +'/preloader/popupWindowsNoWeb3.js' : __dirname +'/preloader/popupWindows.js',
                nodeIntegration: false,
                webgl: false,
                textAreasAreResizable: false,
                webSecurity: false
            }
        };

        var modalWindow = new BrowserWindow(options);
        // modalWindow.setSize(width, 0);
        // modalWindow.show();

        // prevent multiple openings of the same window, from the same owner
        if(e) {
            var ownerId = e.sender.getId();

            if(_.find(global.windows, function(win){ return (win.type === windowType && win.owner.getId() === ownerId); }))
                return;
        }

        // load URL
        modalWindow.loadURL(global.interfacePopupsUrl +'#'+ windowType);

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