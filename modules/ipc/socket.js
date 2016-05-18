
const net = require('net');
const HttpSocket = require('./httpCompatSocket.js');
const prefix = 'http://';

module.exports = function newSocket(ipcPath) {
    if (ipcPath.indexOf(prefix) === 0) {
        const path = ipcPath.substr(prefix.length).split(':');
        const port = parseInt(path[1], 10);
        return new HttpSocket(
            path[0] || 'localhost',
            isNaN(port) ? 8545 : port
        );
    }
    return new net.Socket();
};
