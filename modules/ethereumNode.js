"use strict";

const log = require('./utils/logger').create('EthereumNodes');
const fs = require('fs');
const Q = require('bluebird');
const getNodePath = require('./getNodePath.js');


const DEFAULT_NODE_TYPE = 'geth';
const DEFAULT_NETWORK = 'main';



/**
 * Etheruem nodes manager.
 */
class EthereumNode {
    constructor() {
        this._loadDefaults();

        this._node = null;
        this._type = null;
        this._network = null;
    }

    get isRunning () {
        return !!this._node;
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
     * Get eth node, if running.
     * @return {[type]} [description]
     */
    get eth () {
        return !!
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

        const binPath = getNodeType(nodeType);

        log.debug(`Start node using ${binPath}`);

        const isTestNet = ('test' === network);

        if (isTestNet) {
            log.debug('Node will connect to the test network');
        }

        return this.stop()
            .then(() => {
            })
            .then(() => {
                this._network = network;
                this._type = nodeType;
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
                    this_stopPromise = null;
                });
        }

        return this._stopPromise;
    }


    getLog () {
        return this._loadUserData('/node.log');
    }


    _loadDefaults () {
        this.defaultNodeType = this._loadUserData('/node') || DEFAULT_NODE_TYPE;
        this.defaultNetwork = this._loadUserData('/network') || DEFAULT_NETWORK;
    }


    _loadUserData (path) {
        const fullPath = global.path.USERDATA + path;

        try {
            return fs.readFileSync(fullPath, {encoding: 'utf8'});
        } catch (err){
            log.error(`Unable to read from ${fullPath}`, err);
        }

        return null;
    }

}


module.exports = new EthereumNode();