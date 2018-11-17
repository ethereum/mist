const { app, BrowserWindow, ipcMain: ipc } = require('electron');
const Settings = require('./settings');
const log = require('./utils/logger').create('Windows');
const EventEmitter = require('events').EventEmitter;
import {
  closeWindow,
  openWindow,
  resetGenericWindow,
  reuseGenericWindow
} from './core/ui/actions';

class GenericWindow extends EventEmitter {
  constructor(mgr) {
    super();

    this._mgr = mgr;
    this._log = log.create('generic');
    this.isPrimary = false;
    this.type = 'generic';
    this.isPopup = true;
    this.ownerId = null;
    this.isAvailable = true;
    this.actingType = null;

    this._log.debug('Creating generic window');
    let electronOptions = this._mgr.getDefaultOptionsForType('generic');
    this.window = new BrowserWindow(electronOptions);

    // set Accept_Language header
    this.session = this.window.webContents.session;
    this.session.setUserAgent(this.session.getUserAgent(), Settings.language);

    this.webContents = this.window.webContents;
    this.webContents.once('did-finish-load', () => {
      this._log.debug(`Content loaded, id: ${this.id}`);
      this.emit('ready');
    });

    // prevent dropping files
    this.webContents.on('will-navigate', e => e.preventDefault());

    this.window.once('closed', () => {
      this._log.debug('Closed');
      this.emit('closed');
    });

    this.window.on('close', e => {
      // Preserve window unless quitting Mist
      if (store.getState().ui.appQuit) {
        return this.emit('close', e);
      }
      e.preventDefault();
      this.hide();
    });

    this.window.on('show', e => this.emit('show', e));

    this.window.on('hide', e => this.emit('hide', e));

    this.load(`${global.interfacePopupsUrl}#generic`);
  }

  load(url) {
    this._log.debug(`Load URL: ${url}`);
    this.window.loadURL(url);
  }

  send() {
    this._log.trace('Sending data', arguments);
    this.webContents.send.apply(this.webContents, arguments);
  }

  hide() {
    this._log.debug('Hide');
    this.window.hide();
    this.send('uiAction_switchTemplate', 'generic');
    this.actingType = null;
    this.isAvailable = true;
    this.emit('hidden');
    store.dispatch(resetGenericWindow());
  }

  show() {
    this._log.debug('Show');
    this.window.show();
  }

  close() {
    this._log.debug('Avoiding close of generic window');
    this.hide();
  }

  reuse(type, options, callback) {
    this.isAvailable = false;
    this.actingType = type;
    if (callback) {
      this.callback = callback;
    }
    if (options.ownerId) {
      this.ownerId = options.ownerId;
    }
    if (options.sendData) {
      if (_.isString(options.sendData)) {
        this.send(options.sendData);
      } else if (_.isObject(options.sendData)) {
        for (const key in options.sendData) {
          if ({}.hasOwnProperty.call(options.sendData, key)) {
            this.send(key, options.sendData[key]);
          }
        }
      }
    }
    this.window.setSize(
      options.electronOptions.width,
      options.electronOptions.height
    );
    this.window.setAlwaysOnTop(true, 'floating', 1);
    this.send('uiAction_switchTemplate', type);
    this.show();
    store.dispatch(reuseGenericWindow(type));
  }
}

class Window extends EventEmitter {
  constructor(mgr, type, opts) {
    super();

    opts = opts || {};

    this._mgr = mgr;
    this._log = log.create(type);
    this.isPrimary = !!opts.primary;
    this.type = type;
    this.isPopup = !!opts.isPopup;
    this.ownerId = opts.ownerId; // the window which creates this new window

    let electronOptions = {
      title: Settings.appName,
      show: false,
      width: 1100,
      height: 720,
      icon: global.icon,
      titleBarStyle: 'hidden-inset', // hidden-inset: more space
      backgroundColor: '#F6F6F6',
      acceptFirstMouse: true,
      darkTheme: true,
      webPreferences: {
        nodeIntegration: false,
        webaudio: true,
        webgl: false,
        webSecurity: false, // necessary to make routing work on file:// protocol for assets in windows and popups. Not webviews!
        textAreasAreResizable: true
      }
    };

    electronOptions = _.deepExtend(electronOptions, opts.electronOptions);

    this._log.debug('Creating browser window');

    this.window = new BrowserWindow(electronOptions);

    // set Accept_Language header
    this.session = this.window.webContents.session;
    this.session.setUserAgent(this.session.getUserAgent(), Settings.language);

    this.webContents = this.window.webContents;

    this.webContents.once('did-finish-load', () => {
      this.isContentReady = true;

      this._log.debug(`Content loaded, id: ${this.id}`);

      if (opts.sendData) {
        if (_.isString(opts.sendData)) {
          this.send(opts.sendData);
        } else if (_.isObject(opts.sendData)) {
          for (const key in opts.sendData) {
            if ({}.hasOwnProperty.call(opts.sendData, key)) {
              this.send(key, opts.sendData[key]);
            }
          }
        }
      }

      if (opts.show) {
        this.show();
      }

      this.emit('ready');
    });

    // prevent droping files
    this.webContents.on('will-navigate', e => {
      e.preventDefault();
    });

    this.window.once('closed', () => {
      this._log.debug('Closed');

      this.isShown = false;
      this.isClosed = true;
      this.isContentReady = false;

      this.emit('closed');
      store.dispatch(closeWindow(this.type));
    });

    this.window.once('close', e => {
      this.emit('close', e);
    });

    this.window.on('show', e => {
      this.emit('show', e);
    });

    this.window.on('hide', e => {
      this.emit('hide', e);
    });

    if (opts.url) {
      this.load(opts.url);
    }
  }

  load(url) {
    if (this.isClosed) {
      return;
    }

    this._log.debug(`Load URL: ${url}`);

    this.window.loadURL(url);
  }

  send() {
    if (this.isClosed || !this.isContentReady) {
      return;
    }

    this._log.trace('Sending data', arguments);

    this.webContents.send.apply(this.webContents, arguments);
  }

  hide() {
    if (this.isClosed) {
      return;
    }

    this._log.debug('Hide');

    this.window.hide();

    this.isShown = false;
  }

  show() {
    if (this.isClosed) {
      return;
    }

    this._log.debug('Show');

    this.window.show();

    this.isShown = true;

    store.dispatch(openWindow(this.type));
  }

  close() {
    if (this.isClosed) {
      return;
    }

    this._log.debug('Close');

    this.window.close();
  }
}

class Windows {
  constructor() {
    this._windows = {};
  }

  init() {
    log.info('Creating commonly-used windows');

    this.loading = this.create('loading');
    this.generic = this.createGenericWindow();

    this.loading.on('show', () => {
      this.loading.window.center();
      store.dispatch(openWindow('loading'));
    });

    this.loading.on('hide', () => {
      store.dispatch(closeWindow('loading'));
    });

    // when a window gets initalized it will send us its id
    ipc.on('backendAction_setWindowId', event => {
      const id = event.sender.id;

      log.debug('Set window id', id);

      const bwnd = BrowserWindow.fromWebContents(event.sender);
      const wnd = _.find(this._windows, w => {
        return w.window === bwnd;
      });

      if (wnd) {
        log.trace(`Set window id=${id}, type=${wnd.type}`);

        wnd.id = id;
      }
    });

    store.dispatch({ type: '[MAIN]:WINDOWS:INIT_FINISH' });
  }

  createGenericWindow() {
    const wnd = (this._windows.generic = new GenericWindow(this));
    return wnd;
  }

  create(type, opts, callback) {
    store.dispatch({
      type: '[MAIN]:WINDOW:CREATE_START',
      payload: { type }
    });

    const options = _.deepExtend(
      this.getDefaultOptionsForType(type),
      opts || {}
    );

    const existing = this.getByType(type);

    if (existing && existing.ownerId === options.ownerId) {
      log.debug(
        `Window ${type} with owner ${options.ownerId} already existing.`
      );

      return existing;
    }

    const category = options.primary ? 'primary' : 'secondary';

    log.info(
      `Create ${category} window: ${type}, owner: ${options.ownerId ||
        'notset'}`
    );

    const wnd = (this._windows[type] = new Window(this, type, options));
    wnd.on('closed', this._onWindowClosed.bind(this, wnd));

    if (callback) {
      wnd.callback = callback;
    }

    store.dispatch({
      type: '[MAIN]:WINDOW:CREATE_FINISH',
      payload: { type }
    });

    return wnd;
  }

  getDefaultOptionsForType(type) {
    const mainWebPreferences = {
      mist: {
        nodeIntegration: true /* necessary for webviews;
                    require will be removed through preloader */,
        preload: `${__dirname}/preloader/mistUI.js`,
        'overlay-fullscreen-video': true,
        'overlay-scrollbars': true
      },
      wallet: {
        preload: `${__dirname}/preloader/walletMain.js`,
        'overlay-fullscreen-video': true,
        'overlay-scrollbars': true
      }
    };

    switch (type) {
      case 'main':
        return {
          primary: true,
          electronOptions: {
            width: Math.max(global.defaultWindow.width, 500),
            height: Math.max(global.defaultWindow.height, 440),
            x: global.defaultWindow.x,
            y: global.defaultWindow.y,
            webPreferences: mainWebPreferences[global.mode]
          }
        };
      case 'loading':
        return {
          show: false,
          url: `${global.interfacePopupsUrl}#loadingWindow`,
          electronOptions: {
            title: '',
            alwaysOnTop: true,
            resizable: false,
            width: 100,
            height: 80,
            center: true,
            frame: false,
            useContentSize: true,
            titleBarStyle: '', // hidden-inset: more space
            skipTaskbar: true,
            webPreferences: {
              preload: `${__dirname}/preloader/popupWindowsNoWeb3.js`
            }
          }
        };
      case 'about':
        return {
          url: `${global.interfacePopupsUrl}#about`,
          electronOptions: {
            width: 420,
            height: 230,
            alwaysOnTop: true
          }
        };
      case 'remix':
        return {
          url: 'https://remix.ethereum.org',
          electronOptions: {
            width: 1024,
            height: 720,
            center: true,
            frame: true,
            resizable: true,
            titleBarStyle: 'default'
          }
        };
      case 'importAccount':
        return {
          electronOptions: {
            width: 600,
            height: 370,
            alwaysOnTop: true
          }
        };
      case 'requestAccount':
        return {
          electronOptions: {
            width: 420,
            height: 230,
            alwaysOnTop: true
          }
        };
      case 'connectAccount':
        return {
          electronOptions: {
            width: 460,
            height: 520,
            maximizable: false,
            minimizable: false,
            alwaysOnTop: true
          }
        };
      case 'sendTx':
        return {
          electronOptions: {
            width: 580,
            height: 550,
            alwaysOnTop: true,
            enableLargerThanScreen: false,
            resizable: true
          }
        };
      case 'txHistory':
        return {
          electronOptions: {
            width: 580,
            height: 465,
            alwaysOnTop: false,
            enableLargerThanScreen: false,
            resizable: true
          }
        };
      case 'updateAvailable':
        return {
          useWeb3: false,
          electronOptions: {
            width: 580,
            height: 250,
            alwaysOnTop: true,
            resizable: false,
            maximizable: false
          }
        };
      case 'clientUpdateAvailable':
        return {
          useWeb3: false,
          electronOptions: {
            width: 600,
            height: 340,
            alwaysOnTop: true,
            resizable: false,
            maximizable: false
          }
        };
      case 'generic':
        return {
          title: Settings.appName,
          show: false,
          icon: global.icon,
          titleBarStyle: 'hidden-inset', // hidden-inset: more space
          backgroundColor: '#F6F6F6',
          acceptFirstMouse: true,
          darkTheme: true,
          webPreferences: {
            preload: `${__dirname}/preloader/popupWindows.js`,
            nodeIntegration: false,
            webaudio: true,
            webgl: false,
            webSecurity: false, // necessary to make routing work on file:// protocol for assets in windows and popups. Not webviews!
            textAreasAreResizable: true
          }
        };
    }
  }

  createPopup(type, options, callback) {
    const defaultPopupOpts = {
      url: `${global.interfacePopupsUrl}#${type}`,
      show: true,
      ownerId: null,
      useWeb3: true,
      electronOptions: {
        title: '',
        width: 400,
        height: 400,
        resizable: false,
        center: true,
        useContentSize: true,
        titleBarStyle: 'hidden', // hidden-inset: more space
        autoHideMenuBar: true, // TODO: test on windows
        webPreferences: {
          textAreasAreResizable: false
        }
      }
    };

    let opts = _.deepExtend(
      defaultPopupOpts,
      this.getDefaultOptionsForType(type),
      options || {}
    );

    // always show on top of main window
    const parent = _.find(this._windows, w => {
      return w.type === 'main';
    });

    if (parent) {
      opts.electronOptions.parent = parent.window;
    }

    // mark it as a pop-up window
    opts.isPopup = true;

    if (opts.useWeb3) {
      opts.electronOptions.webPreferences.preload = `${__dirname}/preloader/popupWindows.js`;
    } else {
      opts.electronOptions.webPreferences.preload = `${__dirname}/preloader/popupWindowsNoWeb3.js`;
    }

    // If generic window is available, recycle it (unless on blacklist)
    const genericWindow = this.getByType('generic');
    const genericWindowBlacklist = [
      'remix',
      'updateAvailable',
      'clientUpdateAvailable',
      'connectAccount',
      'sendTx',
      'txHistory'
    ];
    if (
      !genericWindowBlacklist.includes(type) &&
      genericWindow &&
      genericWindow.isAvailable
    ) {
      genericWindow.reuse(type, opts, callback);
      return genericWindow;
    } else if (genericWindow) {
      // If a generic window exists of the same actingType, focus that window
      if (genericWindow.actingType === type) {
        genericWindow.webContents.focus();
        return genericWindow;
      }
    }

    this.loading.show();

    log.info(`Create popup window: ${type}`);

    const wnd = this.create(type, opts, callback);

    wnd.once('ready', () => {
      this.loading.hide();
    });

    return wnd;
  }

  getByType(type) {
    log.trace('Get by type', type);

    return _.find(this._windows, w => {
      return w.type === type;
    });
  }

  getById(id) {
    log.trace('Get by id', id);

    return _.find(this._windows, w => {
      return w.id === id;
    });
  }

  broadcast() {
    const data = arguments;

    log.trace('Broadcast', data);

    _.each(this._windows, wnd => {
      wnd.send(...data);
    });
  }

  /**
   * Handle a window being closed.
   *
   * This will remove the window from the internal list.
   *
   * This also checks to see if any primary windows are still visible
   * (even if hidden). If none found then it quits the app.
   *
   * @param {Window} wnd
   */
  _onWindowClosed(wnd) {
    log.debug(`Removing window from list: ${wnd.type}`);

    for (const t in this._windows) {
      if (this._windows[t] === wnd) {
        delete this._windows[t];

        break;
      }
    }

    const anyOpen = _.find(this._windows, wnd => {
      return wnd.isPrimary && !wnd.isClosed && wnd.isShown;
    });

    if (!anyOpen) {
      log.info('All primary windows closed/invisible, so quitting app...');

      app.quit();
    }
  }
}

module.exports = new Windows();
