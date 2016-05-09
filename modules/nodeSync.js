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
    /**
     * @return {Promise}
     */
    run () {
        if (this._syncPromise) {
            log.debug('Sync already in progress, returning promise');

            return this._syncPromise;
        }

        if (!ethereumNode.isIpcConnected) {
            return Q.reject(new Error('Not yet connected to node via IPC'));
        }

        this._syncPromise = new Q((resolve, reject) => {
            log.info('Starting sync loop');

            this._onDone = resolve;
            this._onError = reject;

            return this._sync();
        })
            .finally(() => {
                log.info('Sync loop ended');

                this._syncPromise = this._onDone = this._onError = null;
            });

        return this._syncPromise;
    }



    _sync () {
        _.delay(() => {
            if (!this._onDone) {
                return;
            }

            log.trace('Check sync status');

            ethereumNode.send('eth_syncing', [])
                .then((result) => {
                    // got a result, check for error
                    if (result) {
                        log.trace('Sync status', result);

                        // got an error?
                        if (result.error) {
                            if (-32601 === result.error.code) {
                                log.warn('Sync method not implemented, skipping sync.');

                                return this._onDone();
                            } else {
                                throw new Error(`Unexpected error: ${result.error}`);
                            }
                        } 
                        // no error, so call again in a bit
                        else {
                            clearTimeout(this._syncTimeout);

                            this.emit('info', 'msg', 'privateChainTimeoutClear');
                            this.emit('info', 'msg', 'nodeSyncing', result);

                            return this._sync();
                        }
                    } 
                    // got no result, let's check the block number
                    else {
                        log.debug('Check latest block number');

                        return ethereumNode.send('eth_getBlockByNumber', ['latest', false])
                            .then((blockResult) => {
                                const now = Math.floor(new Date().getTime() / 1000);

                                const diff = now - +blockResult.timestamp;

                                log.debug(`Last block: ${blockResult.number}, ${diff}s ago`);

                                // need sync if > 1 minutes
                                if(diff > 60) {
                                    this.emit('info', 'msg', 'nodeSyncing', {
                                        currentBlock: +blockResult.number
                                    });

                                    log.trace('Keep syncing...');

                                    // fallback timeout
                                    if (!this._syncTimeout) {
                                        this._syncTimeout = _.delay(() => {
                                            log.debug('Sync timeout handler running');

                                            this.emit('info', 'msg', 'privateChainTimeout');

                                            ipc.on('backendAction_startApp', function() {
                                                ipc.removeAllListeners('backendAction_startApp');

                                                this._onDone();
                                            });
                                        }, 12000 /* 12 seconds */);
                                    }

                                    return this._sync();
                                } else {
                                    log.info('No more sync necessary');

                                    return this._onDone();
                                }
                            });
                    }
                })
                .catch((err) => {
                    log.error('Node crashed while syncing?', err);

                    this._onError(err);
                });
        }, 2000 /* 2 seconds */);
    }

}


module.exports = new NodeSync();



