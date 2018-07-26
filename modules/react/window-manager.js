import path from 'path';
import { app, dialog, BrowserWindow } from 'electron';
let win;

export default class WindowManager {
  createWindow(asarPath) {
    // Create the browser window.
    win = new BrowserWindow({
      width: 1100,
      height: 720,
      webPreferences: {
        preload: path.join(__dirname, '..', 'preloader', 'mistUI.js')
        // preload: path.join(__dirname, 'preload.js')
      }
    });

    // and load the index.html of the app.
    // win.loadFile('index.html')
    if (asarPath) {
      win.loadFile(path.join(asarPath, 'index.html'));
    } else {
      win.loadURL(`http://localhost:${PORT}`);
    }

    // Open the DevTools.
    win.webContents.openDevTools();

    // Emitted when the window is closed.
    win.on('closed', () => {
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      win = null;
    });

    return win;
  }
  showPopup(name) {
    let options = {
      width: 800,
      height: 400
    };
    let windowOptions = {};
    if (name === 'ClientUpdateAvailable') {
      windowOptions = {
        width: 600,
        height: 340,
        alwaysOnTop: false,
        resizable: false,
        maximizable: false
      };
    }
    if (name === 'ConnectAccount') {
      windowOptions = {
        width: 460,
        height: 520,
        maximizable: false,
        minimizable: false,
        alwaysOnTop: true
      };
    }
    if (name === 'SendTransactionConfirmation') {
      windowOptions = {
        width: 580,
        height: 550,
        alwaysOnTop: true,
        enableLargerThanScreen: false,
        resizable: true
      };
    }

    let config = Object.assign(options, windowOptions, {
      parent: win, // The child window will always show on top of the top window.
      modal: true,
      webPreferences: {
        preload: path.join(__dirname, '..', 'preloader', 'mistUI.js')
        // preload: path.join(__dirname, 'preload.js')
      }
    });

    let popup = new BrowserWindow(config);
    popup.loadURL(`http://localhost:${PORT}/index.html?app=popup&name=${name}`);

    popup.webContents.openDevTools({ mode: 'detach' });

    popup.setMenu(null);
  }
}
