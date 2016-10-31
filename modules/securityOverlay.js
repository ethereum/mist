"use strict";

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