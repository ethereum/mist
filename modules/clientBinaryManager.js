"use strict";

const _ = global._;
const path = require('path');
const Q = require('bluebird');
const got = require('got');
const Settings = require('./settings');
const ClientBinaryManager = require('ethereum-client-binaries').Manager;
const EventEmitter = require('events').EventEmitter;

const log = require('./utils/logger').create('ClientBinaryManager');


class Manager extends EventEmitter {
    constructor () {
        super();
        
        this._availableClients = {};
    }
    
    init () {
        log.info('Initializing...');
        
        this._availableClients = {};

        this._emit('progress', 'Fetching client config');
        
        // fetch config
        return got('https://raw.githubusercontent.com/ethereum/mist/master/clientBinaries.json', {
            timeout: 3000,
            json: true,
        })
        .then((res) => {
            if (!res || _.isEmpty(res.body)) {
                throw new Error('Invalid fetch result');
            } else {
                return res.body;
            }
        })
        .catch((err) => {
            log.warn('Error fetching client binaries config from repo', err);
            
            this._emit('progress', 'Loading local client config');

            return require('../clientBinaries.json');
        })
        .then((json) => {
            const mgr = new ClientBinaryManager(json);
            mgr.logger = log;
            
            this._emit('progress', 'Scanning for binaries');

            return mgr.init({
                folders: [
                    path.join(Settings.appDataPath, 'binaries', 'Geth', 'unpacked'),
                    path.join(Settings.appDataPath, 'binaries', 'Eth', 'unpacked'),
                ]
            })
            .then(() => {
                const clients = mgr.clients;
                
                const available = _.filter(clients, (c) => !!c.state.available);
                
                if (!available.length) {
                    if (_.isEmpty(clients)) {
                        throw new Error('No clients binaries available for this system!');
                    }
                    
                    this._emit('progress', 'Downloading binaries');
                    
                    return Q.map(_.values(clients), (c) => {
                        return mgr.download(c.id, {
                            downloadFolder: path.join(Settings.appDataPath, 'binaries'),
                        });
                    });
                }
            })
            .then(() => {
                this._emit('progress', 'Filtering available clients');
                
                _.each(mgr.clients, (client) => {
                    if (client.state.available) {
                        this._availableClients[client.id.toLowerCase()] 
                            = client.activeCli.fullPath;
                    }
                })
            })
        })
        .catch((err) => {
            log.error(err);
            
            this._emit('error', err.message);
        });
    }
    
    getClient (clientId) {
        return this._availableClients[clientId.toLowerCase()];
    }

    getClientBinPath (clientId) {
        clientId = clientId.toLowerCase();
        
        if (!this._availableClients[clientId]) {
            throw new Error(`No client binary available: ${clientId}`);
        }
        
        return this._availableClients[clientId];
    }
    
    _emit(status, msg) {
        log.debug(`Status: ${status} - ${msg}`);
        
        this.emit('status', status, msg);
    }
}


module.exports = new Manager();