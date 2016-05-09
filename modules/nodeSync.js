"use strict";

/**
The nodeSync module,
checks the current node whether its synching or not and how much it kept up already.

@module nodeSync
*/

const _ = global._;
const Q = require('bluebird');
const EventEmitter = require('events').EventEmitter;
const app = require('app');
const ipc = require('electron').ipcMain;
const ethereumNode = require('./ethereumNode');
const log = require('./utils/logger').create('NodeSync');


class NodeSync extends EventEmitter {
    constructor () {
        super();

        this._doLoop = _.bind(this._doLoop, this);
    }

    /**
     * @return {Promise}
     */
    run () {
        log.info('Checking node sync status...');

        if (!ethereumNode.isIpcConnected) {
            return Q.reject(new Error('Not yet connected to node via IPC'));
        }

        return new Q((resolve, reject) => {
            log.info('Starting sync loop...');

            this._syncing = true;

            this._doLoop(resolve, reject);
        })
            .finally(() => {
                this._clearFallbackTimeout();
                this._syncing = false;
            });
    }

    _doLoop (onDone, onError) {
        log.debug('Check latest block');

        if (!this._syncing) {
            return;
        }

        ethereumNode.send('eth_getBlockByNumber', ['latest', false])
            .then((result) => {
                if (!this._syncing) {
                    return;
                }

                const now = Math.floor(new Date().getTime() / 1000);

                const lastBlockTime = parseInt(Math.abs(result.timestamp));

                const diff = now - lastBlockTime;

                log.info(`Time since last block: ${diff}s`);

                // need sync if > 1 minutes
                if(diff > 60) {
                    log.info('Sync necessary, doing it now...');

                    // inform listeners of where we are
                    this.emit('info', 'msg', 'nodeSyncing', {
                        currentBlock: +result.number
                    });

                    ethereumNode.send('eth_syncing', [])
                        .then((result) => {
                            if (!this._syncing) {
                                return;
                            }

                            this._resetFallbackTimeout(onDone, onError);

                            // got a result?
                            if (result) {
                                // got an error?
                                if (result.error) {
                                    if (-32601 === result.error.code) {
                                        log.warn('Sync method not implemented, skipping sync.');

                                        onDone();
                                    } else {
                                        throw new Error(`Unexpected error: ${result.error}`);
                                    }

                                    return; // all done
                                }

                                // no block, let's just update the progress bar
                                if (!_.isString(result.hash)) {
                                    this.emit('info', 'msg', 'privateChainTimeoutClear');
                                    this.emit('info', 'msg', 'nodeSyncing', result);
                                }

                                // loop again
                                return _.defer(this._doLoop);
                            } 
                            // got no result, not syncing anymore
                            else {
                                this._startFallbackTimeout(onDone, onError);
                            }
                        })
                        .catch((err) => {
                            if (!this._syncing) {
                                return;
                            }

                            this._resetFallbackTimeout(onDone, onError);

                            log.error('Node crashed while syncing?', err);

                            onError(err);
                        });
                } else {
                    log.info('No sync necessary, starting app');

                    onDone();
                }
            });
    }


    _startFallbackTimeout (onDone, onError) {
        log.trace('Start fallback timeout');

        this._fallbackTimeout = setTimeout(() => {
            log.debug('Fallback timeout handler running. We are probably running a private chain with no mining.');

            this.emit('info', 'msg', 'privateChainTimeout');

            ipc.on('backendAction_startApp', () => {
                log.debug('Short-circuit sync and start the app.');

                ipc.removeAllListeners('backendAction_startApp');

                onDone();
            });
        }, 1000 * 12 /* 12 seconds */);
    }


    _clearFallbackTimeout (onDone, onError) {
        if (this._fallbackTimeout) {
            log.trace('Reset fallback timeout');
            
            clearTimeout(this._fallbackTimeout);
        }
    }


    _resetFallbackTimeout (onDone, onError) {
        this._clearFallbackTimeout();
        this._startFallbackTimeout(onDone, onError);
    }

}


module.exports = new NodeSync();



