const EventEmitter = require('events').EventEmitter;
const Q = require('bluebird');
const Settings = require('./settings.js');
const Swarm = require('swarm-js');
const ethereumNode = require('./ethereumNode.js');
const fsp = require('fs-promise');
const log = require('./utils/logger').create('Swarm');
const path = require('path');
const fs = require('fs');

class SwarmNode extends EventEmitter {
    constructor() {
        super();

        this._swarm = null;
        this._stop = null;
        this._accountPassword = 'SAP';
    }

    getKeyPath() {
        // TODO: replace by web3.utils.randomHex when we use it
        function randomHex(bytes) {
            let hex = '';
            for (let i = 0; i < bytes * 2; ++i) {
                hex += (Math.random() * 16 | 0).toString(16);
            }
            return hex;
        }

        // Gets Swarm Key path
        const swarmKeyDir = path.dirname(Settings.rpcIpcPath);
        const swarmKeyPath = path.join(swarmKeyDir, 'swarmKey');

        // Generates the key if not there
        if (!fs.existsSync(swarmKeyPath)) {
            fs.writeFileSync(swarmKeyPath, randomHex(32));
        }

        return swarmKeyPath;
    }

    startUsingLocalNode() {
        let totalSize = 26397454; // TODO: to config file?
        let totalDownloaded = 0;

        const swarmBinDir = path.dirname(Settings.rpcIpcPath);
        const swarmBinPath = path.join(swarmBinDir, 'swarm');

        const config = {
            privateKey: this.getKeyPath(),
            dataDir: path.dirname(Settings.rpcIpcPath),
            ethApi: Settings.rpcIpcPath,
            binPath: swarmBinPath,
            onProgress: size => this.emit('downloadProgress', (totalDownloaded += size) / totalSize)
        }

        return new Q((resolve, reject) => {
            Swarm.local(config)(swarm => new Q((stop) => {
                this.emit('started', true);
                this._stop = stop;
                this._swarm = swarm;
                resolve(this);
            }));
        });
    }

    startUsingGateway() {
        return new Q((resolve, reject) => {
            this.emit('started', false);
            this._swarm = Swarm.at(Settings.swarmURL);
            this._stop = () => {};
            resolve(this);
        });
    }

    init() {
        this.emit('starting');

        if (Settings.swarmURL === 'http://localhost:8500') {
            return this.startUsingLocalNode();
        }
        else {
            return this.startUsingGateway();
        }
    }

    upload(arg) {
        if (!this._swarm)
            return Q.reject(new Error('Swarm not initialized. Did you call swarmNode.init()?'));

        return this._swarm.upload(arg);
    }

}

module.exports = new SwarmNode();
