"use strict";

const log = require('./utils/logger').create('EthereumNodes');
const fs = require('fs');
const Q = require('bluebird');
const getNodePath = require('./getNodePath.js');



/**
 * Etheruem nodes manager.
 */
class EthereumNodeManager {
    constructor() {
        this._loadDefaults();

        this._node = null;
    }


    get hasActiveNodes () {
        return !!this._node;
    }

    /**
     * Start an ethereum node.
     * @param  {String} nodeType geth, eth, etc
     * @param  {String} network  network id
     * @return {Promise}
     */
    startNode (nodeType, network) {
        nodeType = nodeType || this.defaultNodeType;
        network = network || this.defaultNetwork;

        log.info('Start node', nodeType, network);

        const binPath = getNodeType(nodeType);

        log.debug(`Start node using ${binPath}`);

        const isTestNet = ('test' === network);

        if (isTestNet) {
            log.debug('Node will connect to the test network');
        }

        return this.stopAllNodes()
            .then(() => {
                
            })
    }


    /**
     * Stop all nodes.
     * 
     * @return {Promise}
     */
    stopAllNodes () {
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


    _loadDefaults () {
        this.defaultNodeType = this._loadUserData('/node');
        this.defaultNetwork = this._loadUserData('/network');
    }


    _loadUserData (path) {
        const fullPath = global.path.USERDATA + path;

        try {
            return fs.readFileSync(fullPath, {encoding: 'utf8'});
        } catch (err){
            log.error(`Unable to read setting from ${fullPath}`, err);
        }

        return null;
    }

}


module.exports = new EthereumNodeManager();