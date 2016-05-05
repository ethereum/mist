"use strict";

const _ = require('./utils/underscore');
const log = require('./utils/logger').create('EthereumNodes');
const app = require('app');
const ipc = require('electron').ipcMain;
const spawn = require('child_process').spawn;
const popupWindow = require('./popupWindow.js');
const logRotate = require('log-rotate');
const fs = require('fs');
const Q = require('bluebird');
const getNodePath = require('./getNodePath.js');
const EventEmitter = require('events').EventEmitter;


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
    }

    get isRunning () {
        return STATE.STARTED = this._state;
    }

    get type () {
        return this._type;
    }

    get isEth () {
        return 'eth' === this._type;
    }

    get isGeth () {
        return 'geth' === this._type;
    }

    get network () {
        return this._network;
    }

    get isMainNetwork () {
        return 'main' === this._network;
    }

    get isTestNetwork () {
        return 'test' === this._network;
    }


    /**
     * Start an ethereum node.
     * @param  {String} nodeType geth, eth, etc
     * @param  {String} network  network id
     * @return {Promise}
     */
    start (nodeType, network) {
        nodeType = nodeType || this.defaultNodeType;
        network = network || this.defaultNetwork;

        log.info('Start node', nodeType, network);

        const isTestNet = ('test' === network);

        if (isTestNet) {
            log.debug('Node will connect to the test network');
        }

        return this.stop()
            .then(() => {
                return this._startNode(nodeType, network);
            })
            .then((proc) => {
                this._node = proc;
                this._network = network;
                this._type = nodeType;

                this._state = STATE.STARTED;

                this._saveUserData('node', this._type);
                this._saveUserData('network', this._network);
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
    _startNode (nodeType, network) {
        this._state = STATE.STARTING;

        const binPath = getNodeType(nodeType);

        log.debug(`Start node using ${binPath}`);

        return new Q((resolve, reject) => {
            if ('eth' === nodeType) {
                let modalWindow = popupWindow.show('unlockMasterPassword', {
                    width: 400, 
                    height: 220, 
                    alwaysOnTop: true
                }, null, null, true);

                let called = false;

                modalWindow.on('closed', () {
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
                            this._startProcess(nodeType, network, binPath, pw, popupCallback)
                                .then(resolve, reject);
                        } else {
                            app.quit();
                        }

                        result = null;
                    }
                });
            } else {
                this._startProcess(type, network, binPath)
                    .then(resolve, reject);
            }
            
        });
    }


    /**
     * @return {Promise}
     */
    _startProcess (nodeType, network, binPath, pw, popupCallback) {
        return new Q((resolve, reject) => {
            // rotate the log file
            logRotate(logfilePath, {count: 5}, (err) => {
                if (err) {
                    log.error('Log rotation problems', err);

                    return reject(err);
                }

                let args;

                // START TESTNET
                if (testnet) {
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
                    data = data.toString();

                    proc.emit('data', data);

                    if (STATE.STARTING === this._state) {
                        // (eth) prevent starting, when "Ethereum (++)" didn't appear yet (necessary for the master pw unlock)
                        if (nodeType === 'eth' && data.indexOf('Ethereum (++)') === -1) {
                            return;
                        } else if (popupCallback) {
                            popupCallback(null);
                        }

                        resolve();
                    }
                });

                // when proc outputs data in stderr
                proc.stderr.on('data', (data) => {
                    if ('eth' === nodeType) {
                        return;
                    }

                    data = data.toString();

                    if (STATE.STARTING === this._state) {
                        // (geth) prevent starting until IPC service is started
                        if (nodeType === 'geth' && data.indexOf('IPC service started') === -1) {
                            return;
                        } 

                        resolve();
                    }
                });
            });
        });
    }


    /**
     * Stop all nodes.
     * 
     * @return {Promise}
     */
    stop () {
        log.info('Stopping node');

        if (!this._stopPromise) {
            this._state = STATE.STOPPING;

            this_stopPromise = new Q((resolve, reject) => {
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
                .finally(() => {
                    this._state = STATE.STOPPED;
                    this._stopPromise = null;
                });
        }

        return this._stopPromise;
    }


    getLog () {
        return this._loadUserData('node.log');
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