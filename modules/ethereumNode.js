"use strict";

const _ = global._;
const log = require('./utils/logger').create('EthereumNode');
const app = require('app');
const ipc = require('electron').ipcMain;
const spawn = require('child_process').spawn;
const popupWindow = require('./popupWindow.js');
const logRotate = require('log-rotate');
const dialog = require('dialog');
const fs = require('fs');
const Q = require('bluebird');
const dechunker = require('./ipc/dechunker.js');
const getNodePath = require('./getNodePath.js');
const EventEmitter = require('events').EventEmitter;
const getIpcPath = require('./ipc/getIpcPath.js')
const Sockets = require('./sockets');

const DEFAULT_NODE_TYPE = 'geth';
const DEFAULT_NETWORK = 'main';


const SPAWN_ERROR = 'SpawnError';



/**
 * Etheruem nodes manager.
 */
class EthereumNode extends EventEmitter {
    constructor() {
        super();

        this._loadDefaults();

        this._node = null;
        this._state = null;
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
                this.emit('info', 'runningNodeFound');
            })
            .catch((err) => {
                log.warn('Failed to connect to node. Maybe it\'s not running so let\'s start our own...');

                this.emit('info', 'msg', 'startingNode');

                log.info(`Node type: ${this.defaultNodeType}`);
                log.info(`Network: ${this.defaultNetwork}`);

                return this._start(this.defaultNodeType, this.defaultNetwork)
                    .then(() => {
                        this.emit('info', 'msg', 'startedNode');
                    })
                    .catch((err) => {
                        log.error('Failed to start node', err);

                        this.emit('info', 'msg', 'nodeBinaryNotFound');
                            
                        throw err;
                    });
            });
    }



    restart (newType, newNetwork, popupWindow) {
        return Q.try(() => {
            if (!this.isOwnNode) {
                throw new Error('Cannot restart node since it was started externally');
            }

            log.info('Restart node', newType, newNetwork);

            return this.stop()
                .then(() => {
                    if (popupWindow) {
                        popupWindow.loadingWindow.show();
                    }
                })
                .then(() => {
                    return this._start(newType || this.type, newNetwork || this.network);
                })
                .then(() => {
                    if (popupWindow) {
                        popupWindow.loadingWindow.hide();
                    }
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
            this._state = STATE.STOPPING;

            log.info('Stopping node');

            return new Q((resolve, reject) => {
                if (!this._node) {
                    return resolve();
                }

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

                        this._node = null;

                        resolve();
                    }
                }, 8000 /* 8 seconds */)

                this._node.once('close', () => {
                    clearTimeout(killTimeout);

                    this._node = null;

                    resolve();
                }); 
            })
                .then(() => {
                    this._sendRequests = {};
                    this._state = STATE.STOPPED;
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

        log.info('Start node', nodeType, network);

        const isTestNet = ('test' === network);

        if (isTestNet) {
            log.debug('Node will connect to the test network');
        }

        return this.stop()
            .then(() => {
                return this.__startNode(nodeType, network)
                    .catch((err) => {
                        let nodelog = this.getNodeLog();

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

                        throw err;
                    });
            })
            .then((proc) => {
                this._node = proc;
                this._state = STATE.STARTED;

                this._saveUserData('node', this._type);
                this._saveUserData('network', this._network);

                return this._socket.connect({ path: ipcPath }, {
                    timeout: 60000 /* 60s */
                })  
                    .catch((err) => {
                        log.error('Failed to connect to node', err);

                        if (0 <= err.toString().indexOf('timeout')) {
                            this.emit('info', 'msg', 'nodeConnectionTimeout', ipcPath);
                        }

                        throw err;
                    });
            })
            .catch((err) => {
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
        this._state = STATE.STARTING;
        this._network = network;
        this._type = nodeType;

        const binPath = getNodePath(nodeType);

        log.debug(`Start node using ${binPath}`);

        return new Q((resolve, reject) => {
            if ('eth' === nodeType) {
                let modalWindow = popupWindow.show('unlockMasterPassword', {
                    width: 400, 
                    height: 220, 
                    alwaysOnTop: true
                }, null, null, true);

                let called = false;

                modalWindow.on('closed', () => {
                    if (!called) {
                        app.quit();
                    }
                });

                let popupCallback = function(err) {
                    if (err && _.get(modalWindow,'webContents')) {
                        if(SPAWN_ERROR === err) {
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

                        result = null;
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
            // rotate the log file
            logRotate(this._buildFilePath('node.log'), {count: 5}, (err) => {
                if (err) {
                    log.error('Log rotation problems', err);

                    return reject(err);
                }

                let args;

                // START TESTNET
                if ('test' == network) {
                    args = (nodeType === 'geth') ? ['--testnet', '--fast'] : ['--morden', '--unsafe-transactions'];
                } 
                // START MAINNET
                else {
                    args = (nodeType === 'geth') ? ['--fast', '--cache','512'] : ['--unsafe-transactions', '--master', pw];
                    pw = null;
                }

                const proc = spawn(binPath, args);

                // node has a problem starting
                proc.once('error', (err) => {
                    if (STATE.STARTING === this._state) {
                        this._state = STATE.ERROR;
                        
                        if (popupCallback) {
                            popupCallback(SPAWN_ERROR);
                        }

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
                    this.emit('data', data);

                    if (STATE.STARTING === this._state) {
                        // (eth) prevent starting, when "Ethereum (++)" didn't appear yet (necessary for the master pw unlock)
                        if (nodeType === 'eth' && data.toString().indexOf('Ethereum (++)') === -1) {
                            return;
                        } else if (popupCallback) {
                            popupCallback(null);
                        }

                        resolve(proc);
                    }
                });

                // when proc outputs data in stderr
                proc.stderr.on('data', (data) => {
                    this.emit('data', data);

                    if ('eth' === nodeType) {
                        return;
                    }

                    if (STATE.STARTING === this._state) {
                        // (geth) prevent starting until IPC service is started
                        if (nodeType === 'geth' && data.toString().indexOf('IPC service started') === -1) {
                            return;
                        } 

                        resolve(proc);
                    }
                });

                this.on('data', _.bind(this._logNodeData, this));
            });
        });
    }


    _logNodeData (data) {
        data = data.toString().replace(/[\r\n]+/,'');

        let nodeType = (this.type || 'node').toUpperCase();

        log.trace(`${nodeType}: ${data}`);

        if (!/^\-*$/.test(data) && !_.isEmpty(data)) {
            this.emit('info', 'nodelog', data);
        }
    }



    _loadDefaults () {
        this.defaultNodeType = this._loadUserData('node') || DEFAULT_NODE_TYPE;
        this.defaultNetwork = this._loadUserData('network') || DEFAULT_NETWORK;
    }


    _loadUserData (path) {
        const fullPath = this._buildFilePath(path);

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


const STATE = EthereumNode.STATE = {
    STARTING: 0,
    STARTED: 1,
    STOPPED: 2,
    STOPPING: 3,
    ERROR: 4,
};



EthereumNode.STARTING = 0;





module.exports = new EthereumNode();