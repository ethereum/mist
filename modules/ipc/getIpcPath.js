/**
Gets the right IPC path

@module getIpcPath
*/

const log = require('../utils/logger').create('getIpcPath');

const Settings = require('../settings');


module.exports = function() {
    var ipcPath = Settings.get('ipcPath');
    if (ipcPath) {
        return ipcPath;
    }
    
    var p = require('path');
    var path = global.path.HOME;

    if(process.platform === 'darwin') {
        path += '/Library/Ethereum/geth.ipc';
    }

    if(process.platform === 'freebsd' ||
       process.platform === 'linux' ||
       process.platform === 'sunos') {
        path += '/.ethereum/geth.ipc';
    }

    if(process.platform === 'win32') {
        path = '\\\\.\\pipe\\geth.ipc';
    }
    
    log.debug(`IPC path: ${path}`);

    return path;
};