"use strict";

const electron = require('electron');
const ipc = electron.ipcMain;
const EventEmitter = require('events').EventEmitter;
const log = require('./utils/logger').create('SecurityOverlay');
const Windows = require('./windows');

class SecurityOverlay {

	static enable () {
		SecurityOverlay.setSecurityOverlay(true);
	}

	static disable () {
		SecurityOverlay.setSecurityOverlay(false);
	}

	static setSecurityOverlay (flag) {
		let mainWindow = Windows.getByType('main');
		mainWindow.send('mistUI_enableSecurityOverlay', flag);
	}

};

module.exports = SecurityOverlay;