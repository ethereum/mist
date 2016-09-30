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
        
        this._resolveEthBinPath();

        this._emit('loadConfig', 'Fetching client config');
        
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
            
            this._emit('loadConfig', 'Loading local client config');

            return require('../clientBinaries.json');
        })
        .then((json) => {
            const mgr = new ClientBinaryManager(json);
            mgr.logger = log;
            
            this._emit('scanning', 'Scanning for binaries');

            return mgr.init({
                folders: [
                    path.join(Settings.userDataPath, 'binaries', 'Geth', 'unpacked'),
                    path.join(Settings.userDataPath, 'binaries', 'Eth', 'unpacked'),
                ]
            })
            .then(() => {
                const clients = mgr.clients;
                
                const available = _.filter(clients, (c) => !!c.state.available);
                
                if (!available.length) {
                    if (_.isEmpty(clients)) {
                        throw new Error('No client binaries available for this system!');
                    }
                    
                    this._emit('downloading', 'Downloading binaries');
                    
                    return Q.map(_.values(clients), (c) => {
                        return mgr.download(c.id, {
                            downloadFolder: path.join(Settings.userDataPath, 'binaries'),
                        });
                    });
                }
            })
            .then(() => {
                this._emit('filtering', 'Filtering available clients');
                
                _.each(mgr.clients, (client) => {
                    if (client.state.available) {
                        const idlcase = client.id.toLowerCase();
                        
                        this._availableClients[idlcase] = {
                            binPath: Settings[`${idlcase}Path`] || client.activeCli.fullPath,
                            version: client.version,
                        }
                    }
                });
                
                this._emit('done');                
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

    
    _emit(status, msg) {
        log.debug(`Status: ${status} - ${msg}`);
        
        this.emit('status', status, msg);
    }
    
    
    _resolveEthBinPath () {
        log.info('Resolving path to Eth client binary ...');
        
        let platform = process.platform;

        // "win32" -> "win" (because nodes are bundled by electron-builder)
        if (0 === platform.indexOf('win')) {
            platform = 'win';
        } else if (0 === platform.indexOf('darwin')) {
            platform = 'mac';
        }

        log.debug('Platform: ' + platform);

        let binPath = path.join(
            __dirname, 
            '..', 
            'nodes',
            'eth',
            `${platform}-${process.arch}`
        );

        if (Settings.inProductionMode) {
            // get out of the ASAR
            binPath = binPath.replace('nodes', path.join('..', '..', 'nodes'));
        }

        binPath = path.join(path.resolve(binPath), 'eth');

        if ('win' === platform) {
            binPath += '.exe';
        }

        log.info('Eth client binary path: ' + binPath);
        
        this._availableClients.eth = {
            binPath: binPath,
            version: '1.3.0',
        };
    }
}


module.exports = new Manager();