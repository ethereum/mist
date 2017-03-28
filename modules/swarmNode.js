const EventEmitter = require('events').EventEmitter;
const Q = require('bluebird');
const Settings = require('./settings.js');
const Swarm = require('swarm-js');
const db = require('./db.js');
const ethereumNode = require('./ethereumNode.js');
const fsp = require('fs-promise');
const log = require('./utils/logger').create('Swarm');
const path = require('path');

class SwarmNode extends EventEmitter {
    constructor() {
        super();

        this._swarm = null;
        this._stop = null;
        this._accountPassword = 'SAP';
    }

    getAccount() {
        // Get swarm account from DB
        const accounts = db.getCollection('UI_accounts');
        const swarmAccounts = accounts.find({ type: 'swarm' });

        // If it is there, return and resolve
        if (swarmAccounts.length > 0) {
            return new Promise(resolve => resolve(swarmAccounts[0]));
        }

        // If it is not there, create it
        return ethereumNode
            .send('personal_newAccount', [this._accountPassword])
            .then((addressResponse) => {
                const swarmAccount = {
                    name: 'swarmAccount',
                    address: addressResponse.result,
                    permissions: [],
                    type: 'swarm',
                    password: this._accountPassword
                };
                accounts.insert(swarmAccount);
                return swarmAccount;
            });
    }

    startLocalNode() {
        return this.getAccount().then((account) => {
          let totalSize = 26397454; // TODO: to config file?
          let totalDownloaded = 0;

          const config = {
              account: account.address,
              password: this._accountPassword,
              dataDir: path.dirname(Settings.rpcIpcPath),
              ethApi: Settings.rpcIpcPath,
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
            return this.startLocalNode();
        }
        else {
            return this.startUsingGateway();
        }
    }

    /**
     * Uploads data to Swarm netork.
     * If pathOrContents is a buffer, uploads it.
     * If it is an object mapping paths to buffers, uploads that directory.
     * If it is a string, uploads the file/directory at that path.
     * In that case, defaultFile can be set to define the directory root.
     *
     * @param  {(Buffer|Object|String)} pathOrContents
     * @param  {String} [defaultFile]
     * @return {Promise String}
     */
    upload(pathOrContents, defaultFile) {
        if (!this._swarm)
            return Q.reject(new Error('Swarm not initialized. Did you call swarmNode.init()?'));

        return this._swarm.upload(pathOrContents, defaultFile);
    }

}

module.exports = new SwarmNode();
