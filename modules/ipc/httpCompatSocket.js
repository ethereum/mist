
const util = require('util');
const EventEmitter = require('events').EventEmitter;
const http = require('http');

function call(hostname, port, data) {
    return new Promise((resolve, reject) => {
        console.log(data);
        const req = http.request({
            hostname: hostname,
            port: port,
            path: '/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        }, resolve);

        // TODO Not sure why it's needed
        // Seems that responses hang somewhere without it
        setTimeout(() => {
            req.on('error', reject);
            req.write(data);
            req.end();
        }, 50);
    });
}

function HttpCompatSocket(hostname, port) {
    this.call = call.bind(null, hostname, port);
}

util.inherits(HttpCompatSocket, EventEmitter);

Object.assign(HttpCompatSocket.prototype, {
    call: null,
    encoding: 'utf8',
    writable: true, // socket is always writable

    connect(event) {
        this.call(JSON.stringify({
            jsonrpc: "2.0",
            id: 0,
            method: "eth_syncing",
            params: []
        })).then((res) => {
            if (res.statusCode === 200) {
                return this.emit('connect');
            }
            throw 'Unable to connect to HTTP RPC';
        }).catch(this.emit.bind(this, 'error'));
        return this;
    },
    write(msg) {
        this.call(msg)
            .then((res) => {
                res.setEncoding(this.encoding);
                res.on('data', (chunk) => this.emit('data', chunk));
                res.on('end', (chunk) => this.emit('data', chunk || ''));
            })
            .catch((err) => this.emit('error', err));
    },
    setEncoding(encoding) {
        this.encoding = encoding;
    },
    setTimeout(timeout) {
    },
    destroy() {
    },
});


module.exports = HttpCompatSocket;
