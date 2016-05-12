"use strict";

const _ = global._;
const Q = require('bluebird');
const EventEmitter = require('events').EventEmitter;
const log = require('./utils/logger').create('Windows');
const BrowserWindow = require('browser-window');  // Module to create native browser window.



class Window extends EventEmitter {
    constructor (mgr, type, opts) {
        super();

        opts = opts || {};

        this._mgr = mgr;
        this._log = log.create(type);
        this.type = type;
        this.owner = opts.owner;

        let electronOptions = {
            title: global.appName,
            show: opts.show || false,
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

        this.window = new BrowserWindow(electronOptions);
        this.webContents = this.window.webContents;


        this.window.webContents.on('did-finish-load', () => {
            this._log.debug(`Content loaded`);

            this.id = this.window.webContents.getId();
            this.isContentReady = true;

            if (opts.sendData) {
                this.send(opts.sendData);
            }

            this.emit('content-loaded');
        });

        this.window.on('closed', () => {
            this._log.debug(`Closed`);

            this.isClosed = true;
            this.isContentReady = false;

            delete this._mgr._windows[this.type];
        });

        this.window.on('close', (e) => {
            this.emit('close', e);
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

    create (type, options) {
        let existing = this.getByType(type);

        if (existing && existing.owner === options.owner) {
            log.debug(`Window ${type} with owner ${options.owner} already created.`);

            return existing;
        }

        log.info(`Create window: ${type}, owner: ${options.owner || 'notset'}`);

        let wnd = this._windows[type] = new Window(this, type, options);

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



