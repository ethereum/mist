"use strict";

const _ = global._;
const log = require('./utils/logger').create('EthereumNode');
const electron = require('electron');
const app = electron.app;
const ipc = electron.ipcMain;
const spawn = require('child_process').spawn;
const Windows = require('./windows.js');
const logRotate = require('log-rotate');
const dialog = electron.dialog;
const fs = require('fs');
const Q = require('bluebird');
const dechunker = require('./ipc/dechunker.js');
const getNodePath = require('./getNodePath.js');
const EventEmitter = require('events').EventEmitter;
const getIpcPath = require('./ipc/getIpcPath.js')
const Sockets = require('./sockets');
const Settings = require('./settings');

const DEFAULT_NODE_TYPE = 'geth';
const DEFAULT_NETWORK = 'main';


const UNABLE_TO_BIND_PORT_ERROR = 'unableToBindPort';
const UNABLE_TO_SPAWN_ERROR = 'unableToSpan';
const PASSWORD_WRONG_ERROR = 'badPassword';



/**
 * Etheruem nodes manager.
 */
class EthereumNode extends EventEmitter {
    constructor() {
        super();

        this.STATES = STATES;

        this._loadDefaults();

        this._node = null;
        this._type = null;
        this._network = null;

        this._socket = Sockets.get('node-ipc');
        this._socket.on('data', _.bind(this._handleSocketResponse, this));

        this._sendRequests = {};

        this.on('data', _.bind(this._logNodeData, this));
    }

    get isOwnNode () {
        return !!this._node;
    }

    get isExternalNode () {
        return !this._node;
    }

    get isIpcConnected () {
        return this._socket.isConnected;
    }

    get type () {
        return this.isOwnNode ? this._type : null;
    }

    get network () {
        return this.isOwnNode ? this._network : null;
    }

    get isEth () {
        return this.type === 'eth';
    }

    get isGeth () {
        return this.type === 'geth';
    }

    get isMainNetwork () {
        return 'main' === this.network;
    }

    get isTestNetwork () {
        return 'test' === this.network;
    }

    get state () {
        return this._state;
    }

    get stateAsText () {
        switch (this._state) {
            case STATES.STARTING:
                return 'starting';
            case STATES.STARTED:
                return 'started';
            case STATES.CONNECTED:
                return 'connected';
            case STATES.STOPPING:
                return 'stopping';
            case STATES.STOPPED:
                return 'stopped';
            case STATES.ERROR:
                return 'error';
        }
    }

    set state (newState) {
        this._state = newState;

        this.emit('state', this.state, this.stateAsText);
    }

    get lastError () {
        return this._lastErr;
    }

    set lastError (err) {
        return this._lastErr = err;
    }

    /**
     * This method should always be called first to initialise the connection.
     * @return {Promise}
     */
    init () {
        const ipcPath = getIpcPath();

        // TODO: if connection to external node is successful then query it to
        // determine node and network type

        return this._socket.connect({path: ipcPath})
            .then(()=> {
                this.state = STATES.CONNECTED;

                this.emit('runningNodeFound');
            })
            .catch((err) => {
                log.warn('Failed to connect to node. Maybe it\'s not running so let\'s start our own...');

                log.info(`Node type: ${this.defaultNodeType}`);
                log.info(`Network: ${this.defaultNetwork}`);

                return this._start(this.defaultNodeType, this.defaultNetwork)
                    .catch((err) => {
                        log.error('Failed to start node', err);
                            
                        throw err;
                    });
            });
    }



    restart (newType, newNetwork) {
        return Q.try(() => {
            if (!this.isOwnNode) {
                throw new Error('Cannot restart node since it was started externally');
            }

            log.info('Restart node', newType, newNetwork);

            return this.stop()
                .then(() => {
                    Windows.loading.show();
                })
                .then(() => {
                    return this._start(newType || this.type, newNetwork || this.network);
                })
                .then(() => {
                    Windows.loading.hide();
                })
                .catch((err) => {
                    log.error('Error restarting node', err);

                    throw err;
                });
        });
    }



    /**
     * Stop node.
     * 
     * @return {Promise}
     */
    stop () {
        if (!this._stopPromise) {
            return new Q((resolve, reject) => {
                if (!this._node) {
                    return resolve();
                }

                this.state = STATES.STOPPING;

                log.info(`Stopping existing node: ${this.type} ${this.network}`);

                this._node.stderr.removeAllListeners('data');
                this._node.stdout.removeAllListeners('data');
                this._node.stdin.removeAllListeners('error');
                this._node.removeAllListeners('error');
                this._node.removeAllListeners('exit');
                
                this._node.kill('SIGINT');

                // after some time just kill it if not already done so
                let killTimeout = setTimeout(() => {
                    if (this._node) {
                        this._node.kill('SIGKILL');
                    }
                }, 8000 /* 8 seconds */)

                this._node.once('close', () => {
                    clearTimeout(killTimeout);

                    this._node = null;

                    resolve();
                }); 
            })
                .then(() => {
                    this.state = STATES.STOPPED;
                    this._sendRequests = {};
                    this._stopPromise = null;
                });
        } else {
            log.debug('Disconnection already in progress, returning Promise.');
        }

        return this._stopPromise;
    }


    getLog () {
        return this._loadUserData('node.log');
    }



    /** 
     * Send command to socket.
     * @param  {String} name
     * @param  {Array} [params]
     * @return {Promise} resolves to result or error.
     */
    send (name, params) {
        return Q.try(() => {
            if (!this.isIpcConnected) {
                throw new Error('IPC socket not connected');
            }

            return new Q((resolve, reject) => {
                let requestId = _.uuid();

                log.trace('Request', requestId, name , params);

                this._sendRequests[requestId] = {
                    resolve: resolve,
                    reject: reject,
                };

                this._socket.write(JSON.stringify({
                    jsonrpc: '2.0',
                    id: requestId,
                    method: name,
                    params: params || []
                }));
            })
        });
    }



    _handleSocketResponse (data) {
        dechunker(data, (err, result) => {
            try {
                if (err) {
                    log.error('Socket response error', err);

                    _.each(this._sendRequests, (req) => {
                        req.reject(err);
                    });

                    this._sendRequests = {};
                } else {
                    let req = this._sendRequests[result.id];

                    if (req) {
                        log.trace('Response', result.id, result.result);

                        req.resolve(result.result);
                    } else {
                        log.debug(`Unable to find corresponding request for ${result.id}`, result);
                    }
                }
            } catch (err) {
                log.error('Error handling socket response', err);
            }
        });
    }



    /**
     * Start an ethereum node.
     * @param  {String} nodeType geth, eth, etc
     * @param  {String} network  network id
     * @return {Promise}
     */
    _start (nodeType, network) {
        const ipcPath = getIpcPath();

        log.info(`Start node: ${nodeType} ${network}`);

        const isTestNet = ('test' === network);

        if (isTestNet) {
            log.debug('Node will connect to the test network');
        }

        return this.stop()
            .then(() => {
                return this.__startNode(nodeType, network)
                    .catch((err) => {
                        log.error('Failed to start node', err);

                        this._showNodeErrorDialog(nodeType, network);

                        throw err;
                    });
            })
            .then((proc) => {
                log.info(`Started node successfully: ${nodeType} ${network}`);

                this._node = proc;
                this.state = STATES.STARTED;

                this._saveUserData('node', this._type);
                this._saveUserData('network', this._network);

                return this._socket.connect({ path: ipcPath }, {
                    timeout: 30000 /* 30s */
                })  
                    .then(() => {
                        this.state = STATES.CONNECTED;
                    })
                    .catch((err) => {
                        log.error('Failed to connect to node', err);

                        if (0 <= err.toString().indexOf('timeout')) {
                            this.emit('nodeConnectionTimeout');
                        }

                        this._showNodeErrorDialog(nodeType, network);

                        throw err;
                    });
            })
            .catch((err) => {
                // set before updating state so that state change event observers
                // can pick up on this
                this.lastError = err.tag; 
                this.state = STATES.ERROR;

                // if unable to start eth node then write geth to defaults
                if ('eth' === nodeType) {
                    this._saveUserData('node', 'geth');
                }

                throw err;
            });
    }


    /**
     * @return {Promise}
     */
    __startNode (nodeType, network) {
        this.state = STATES.STARTING;

        this._network = network;
        this._type = nodeType;

        const binPath = getNodePath(nodeType);

        log.debug(`Start node using ${binPath}`);

        return new Q((resolve, reject) => {
            if ('eth' === nodeType) {
                let modalWindow = Windows.createPopup('unlockMasterPassword', {
                    electronOptions: {
                        width: 400, 
                        height: 220, 
                    },
                    useWeb3: false,
                });

                let called = false;

                modalWindow.on('closed', () => {
                    if (!called) {
                        app.quit();
                    }
                });

                let popupCallback = function(err) {
                    if (err && _.get(modalWindow,'webContents')) {
                        log.error('unlockMasterPassword error', err);

                        if(UNABLE_TO_SPAWN_ERROR === err) {
                            modalWindow.close();
                            modalWindow = null;
                        } else {
                            modalWindow.webContents.send('data', {
                                masterPasswordWrong: true
                            });
                        }
                    } else {
                        called = true;
                        modalWindow.close();
                        modalWindow = null;
                        ipc.removeAllListeners('backendAction_unlockedMasterPassword');
                    }
                };

                ipc.on('backendAction_unlockedMasterPassword', (ev, err, pw) => {
                    if (_.get(modalWindow, 'webContents') && ev.sender.getId() === modalWindow.webContents.getId()) {
                        if (!err) {
                            this.__startProcess(nodeType, network, binPath, pw, popupCallback)
                                .then(resolve, reject);
                        } else {
                            app.quit();
                        }

                        return;
                    }
                });
            } else {
                this.__startProcess(nodeType, network, binPath)
                    .then(resolve, reject);
            }
            
        });
    }


    /**
     * @return {Promise}
     */
    __startProcess (nodeType, network, binPath, pw, popupCallback) {
        return new Q((resolve, reject) => {
            log.trace('Rotate log file');

            // rotate the log file
            logRotate(this._buildFilePath('node.log'), {count: 5}, (err) => {
                if (err) {
                    log.error('Log rotation problems', err);

                    return reject(err);
                }

                let args;

                // START TESTNET
                if ('test' == network) {
                    args = (nodeType === 'geth') 
                        ? ['--testnet', '--fast', '--ipcpath', getIpcPath()] 
                        : ['--morden', '--unsafe-transactions'];
                } 
                // START MAINNET
                else {
                    args = (nodeType === 'geth') 
                        ? ['--fast', '--cache', '512'] 
                        : ['--unsafe-transactions', '--master', pw];
                    pw = null;
                }

                let nodeOptions = Settings.get('nodeOptions');

                if (nodeOptions && nodeOptions.length) {
                    log.debug('Custom node options', nodeOptions);

                    args = args.concat(nodeOptions);
                }

                log.trace('Spawn', binPath, args);

                const proc = spawn(binPath, args);

                // node has a problem starting
                proc.once('error', (err) => {
                    if (STATES.STARTING === this.state) {
                        this.state = STATES.ERROR;
                        
                        if (popupCallback) {
                            popupCallback(UNABLE_TO_SPAWN_ERROR);
                        }

                        log.info('Node startup error');

                        // TODO: detect this properly
                        // this.emit('nodeBinaryNotFound');

                        reject(err);
                    }
                });

                // node quit, e.g. master pw wrong
                proc.once('exit', () => {
                    if ('eth' === nodeType) {
                        log.warn('Password wrong!');

                        if (popupCallback) {
                            popupCallback(PASSWORD_WRONG_ERROR);
                        }
                    }
                });

                // we need to read the buff to prevent node from not working
                proc.stderr.pipe(
                    fs.createWriteStream(this._buildFilePath('node.log'), { flags: 'a' })
                );

                // when proc outputs data
                proc.stdout.on('data', (data) => {
                    log.trace('Got stdout data');

                    this.emit('data', data);

                    // check for startup errors
                    if (STATES.STARTING === this.state) {
                        let dataStr = data.toString().toLowerCase();

                        if ('geth' === nodeType) {
                            if (0 <= dataStr.indexOf('fatal: error')) {
                                let err = new Error(`Geth error: ${dataStr}`);

                                if (0 <= dataStr.indexOf('bind')) {
                                    err.tag = UNABLE_TO_BIND_PORT_ERROR;
                                }

                                log.debug(err.message);

                                return reject(err);
                            }
                        }
                    }
                });

                // when proc outputs data in stderr
                proc.stderr.on('data', (data) => {
                    log.trace('Got stderr data');

                    this.emit('data', data);
                });


                this.on('data', _.bind(this._logNodeData, this));

                // when data is first received
                this.once('data', () => {
                    /*
                        Assume startup succeeded after 5 seconds. At this point 
                        IPC connections are usually possible.
                    */
                    setTimeout(() => {
                        if (STATES.STARTING === this.state) {
                            log.info('4s elapsed, assuming node started up successfully');

                            if (popupCallback) {
                                popupCallback();
                            }

                            resolve();                        
                        }
                    }, 4000);
                })
            });
        });
    }


    _showNodeErrorDialog(nodeType, network) {
        let nodelog = this.getLog();

        if (nodelog) {
            nodelog = '...'+ nodelog.slice(-1000);
        } else {
            nodelog = global.i18n.t('mist.errors.nodeStartup');
        }

        // add node type
        nodelog = 'Node type: '+ nodeType + "\n" +
            'Network: '+ network + "\n" +
            'Platform: '+ process.platform +' (Architecure '+ process.arch +')'+"\n\n" +
            nodelog;

        dialog.showMessageBox({
            type: "error",
            buttons: ['OK'],
            message: global.i18n.t('mist.errors.nodeConnect'),
            detail: nodelog
        }, function(){});
    }


    _logNodeData (data) {
        data = data.toString().replace(/[\r\n]+/,'');

        let nodeType = (this.type || 'node').toUpperCase();

        log.trace(`${nodeType}: ${data}`);

        if (!/^\-*$/.test(data) && !_.isEmpty(data)) {
            this.emit('nodeLog', data);
        }
    }



    _loadDefaults () {
        log.trace('Load defaults');

        this.defaultNodeType = this._loadUserData('node') || DEFAULT_NODE_TYPE;
        this.defaultNetwork = this._loadUserData('network') || DEFAULT_NETWORK;
    }


    _loadUserData (path) {
        const fullPath = this._buildFilePath(path);

        log.trace('Load user data', fullPath);

        try {
            return fs.readFileSync(fullPath, {encoding: 'utf8'});
        } catch (err){
            log.error(`Unable to read from ${fullPath}`, err);
        }

        return null;
    }


    _saveUserData (path, data) {
        const fullPath = this._buildFilePath(path);

        try {
            fs.writeFileSync(fullPath, data, {encoding: 'utf8'});
        } catch (err){
            log.error(`Unable to write to ${fullPath}`, err);
        }
    }


    _buildFilePath (path) {
        return global.path.USERDATA + '/' + path;   
    }

}


const STATES = {
    STARTING: 0, /* Node about to be started */
    STARTED: 1, /* Node started */
    CONNECTED: 2, /* IPC connected - all ready */
    STOPPING: 3, /* Node about to be stopped */
    STOPPED: 4, /* Node stopped */
    ERROR: -1, /* Unexpected error */
};



EthereumNode.STARTING = 0;





module.exports = new EthereumNode();

