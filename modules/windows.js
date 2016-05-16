"use strict";

const _ = global._;
const Q = require('bluebird');
const EventEmitter = require('events').EventEmitter;
const log = require('./utils/logger').create('Windows');
const BrowserWindow = require('electron').BrowserWindow;



class Window extends EventEmitter {
    constructor (mgr, type, opts) {
        super();

        opts = opts || {};

        this._mgr = mgr;
        this._log = log.create(type);
        this.type = type;
        this.ownerId = opts.ownerId;

        let electronOptions = {
            title: global.appName,
            show: false,
            width: 1100,
            height: 720,
            icon: global.icon,
            titleBarStyle: 'hidden-inset', //hidden-inset: more space
            backgroundColor: '#F6F6F6',
            acceptFirstMouse: true,
            darkTheme: true,
            webPreferences: {
                nodeIntegration: false,
                webaudio: true,
                webgl: false,
                webSecurity: false, // necessary to make routing work on file:// protocol
                textAreasAreResizable: true,
            },
        };

        _.extendDeep(electronOptions, opts.electronOptions);

        this._log.debug('Creating browser window');

        this.window = new BrowserWindow(electronOptions);

        this.webContents = this.window.webContents;

        this.webContents.once('did-finish-load', () => {
            this._log.debug(`Content loaded`);

            this.isContentReady = true;

            this.id = this.webContents.getId();

            if (opts.sendData) {
                this.send.apply(this, opts.sendData);
            }

            if (opts.show) {
                this.window.show();
            }

            this.emit('ready');
        });

        this.window.once('closed', () => {
            this._log.debug(`Closed`);

            this.isClosed = true;
            this.isContentReady = false;

            delete this._mgr._windows[this.type];

            this.emit('closed');
        });

        this.window.on('close', (e) => {
            this.emit('close', e);
        });

        this.window.on('show', (e) => {
            this.emit('show', e);
        });

        this.window.on('hide', (e) => {
            this.emit('hide', e);
        });

        if (opts.url) {
            this.load(opts.url);
        }
    }

    load (url) {
        if (this.isClosed) { 
            return;
        }

        this._log.debug(`Load URL: ${url}`);

        this.window.loadURL(url);
    }

    send () {
        if (!this.isContentReady) { 
            return;
        }

        this._log.trace(`Sending data`, arguments);

        this.webContents.send.apply(
            this.webContents,
            arguments
        );
    }


    hide () {
        if (this.isClosed) {
            return;
        }

        this._log.debug(`Hide`);

        this.window.hide();
    }


    show () {
        if (this.isClosed) {
            return;
        }

        this._log.debug(`Show`);

        this.window.show();
    }


    close () {
        if (this.isClosed) {
            return;
        }

        this._log.debug(`Close`);

        this.window.close();
    }
}




class Windows {
    constructor () {
        this._windows = {};
    }


    init () {
        log.info('Creating commonly-used windows');

        this.loading = this.create('loading', {
            show: false,
            url: global.interfacePopupsUrl +'#loadingWindow',
            electronOptions: {
                title: '',
                alwaysOnTop: true,
                resizable: false,
                width: 100,
                height: 50,
                center: true,
                frame: false,
                useContentSize: true,
                titleBarStyle: 'hidden', //hidden-inset: more space
            },
        });

        this.loading.on('show', () => {
            this.loading.window.center();
        });
    }


    create (type, options) {
        options = options || {};

        let existing = this.getByType(type);

        if (existing && existing.ownerId === options.ownerId) {
            log.debug(`Window ${type} with owner ${options.ownerId} already created.`);

            return existing;
        }

        log.info(`Create window: ${type}, owner: ${options.ownerId || 'notset'}`);

        let wnd = this._windows[type] = new Window(this, type, options);

        return wnd;
    }


    createPopup(type, options) {
        options = options || {};

        let opts = {
            url: global.interfacePopupsUrl +'#'+ type,
            show: true,
            ownerId: null,
            useWeb3: true,
            electronOptions: {
                title: '',
                alwaysOnTop: false,
                width: 400,
                height: 400,
                center: true,
                useContentSize: true,
                titleBarStyle: 'hidden', //hidden-inset: more space
                autoHideMenuBar: true, // TODO: test on windows
                webPreferences: {
                    textAreasAreResizable: false,
                },
            },
        };

        _.extendDeep(opts, options);

        // resizable on by default if alwaysOnTop
        opts.electronOptions.resizable = 
            options.resizable || opts.electronOptions.alwaysOnTop;

        if (opts.useWeb3) {
            opts.electronOptions.webPreferences.preload = __dirname +'/preloader/popupWindows.js';            opts.electronOptions.webPreferences.preload = __dirname +'/preloader/popupWindows.js';
        } else {
            opts.electronOptions.webPreferences.preload = __dirname +'/preloader/popupWindowsNoWeb3.js';
        }

        this.loading.show();

        log.info(`Create popup window: ${type}`);

        let wnd = this.create(type, opts);

        wnd.once('ready', () => {
            this.loading.hide();
        });

        return wnd;
    }


    getByType (type) {
        return _.find(this._windows, (w) => {
            return w.type === type;
        });
    }


    getById (id) {
        return _.find(this._windows, (w) => {
            return (w.id === id);
        });
    }


    broadcast () {
        const data = arguments;

        _.each(this._windows, (wnd) => {
            wnd.send.apply(wnd, data);
        });
    }
}


module.exports = new Windows();



