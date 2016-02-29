/**
@module popupWindow
*/
const BrowserWindow = require('browser-window');

module.exports = {
    loadingWindow: {
        window: null,
        init: function(){
            var _this = this;

            this.window = new BrowserWindow({
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
            this.window.on('closed', function() {
                _this.window = null;
            });
            // load URL
            this.window.loadURL(global.interfacePopupsUrl +'#loadingWindow');
        },
        show: function(){
            this.window.center();
            this.window.show();
        },
        hide: function(){
            this.window.hide();
        }  
    },
    show: function(windowType, options, data, e, noWeb3){
        var _this = this;

        this.loadingWindow.show();

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
            autoHideMenuBar: true, // TODO: test on windows
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
            if(data && modalWindow && modalWindow.webContents && !modalWindow.webContents.isDestroyed())
                modalWindow.webContents.send('data', data);
        });
        modalWindow.webContents.on('did-finish-load', function() {
            _this.loadingWindow.hide();
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