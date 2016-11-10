/**
The nodeSync module,
checks the current node whether its synching or not and how much it kept up already.

@module nodeSync
*/

const _ = global._;
const Q = require('bluebird');
const EventEmitter = require('events').EventEmitter;
const electron = require('electron');
const app = electron.app;
const ipc = electron.ipcMain;
const ethereumNode = require('./ethereumNode');
const log = require('./utils/logger').create('NodeSync');


const SYNC_CHECK_INTERVAL_MS = 2000;


class NodeSync extends EventEmitter {
    constructor() {
        super();

        ethereumNode.on('state', _.bind(this._onNodeStateChanged, this));
    }

    /**
     * @return {Promise}
     */
    start() {
        if (this._syncPromise) {
            log.warn('Sync already in progress, returning Promise');

            return Q.resolve(this._syncPromise);
        }

        this._syncPromise = Q.try(() => {
            if (!ethereumNode.isIpcConnected) {
                throw new Error('Cannot sync - Ethereum node not yet connected');
            }

            return new Q((resolve, reject) => {
                log.info('Starting sync loop');

                this._syncInProgress = true;
                this._onSyncDone = resolve;
                this._onSyncError = reject;

                this.emit('starting');

                ipc.on('backendAction_skipSync', () => {
                    ipc.removeAllListeners('backendAction_skipSync');

                    this._onSyncDone();
                });

                this._sync();
            });
        })
            .then(() => {
                this.emit('finished');
            })
            .catch((err) => {
                log.error('Sync error', err);

                this.emit('error', err);
            })
            .finally(() => {
                log.info('Sync loop ended');

                this._clearState();
            });

        return this._syncPromise;
    }


    /**
     * @return {Promise}
     */
    stop() {
        return Q.try(() => {
            if (!this._syncInProgress) {
                log.debug('Sync not already in progress.');
            } else {
                log.info('Stopping sync loop');

                this._clearState();

                return Q.delay(SYNC_CHECK_INTERVAL_MS)
                    .then(() => {
                        this.emit('stopped');
                    });
            }
        });
    }


    _clearState() {
        ipc.removeAllListeners('backendAction_skipSync');

        this._syncInProgress
            = this._syncPromise
            = this._onSyncDone
            = this._onSyncError
            = false;
    }


    _sync() {
        _.delay(() => {
            if (!this._syncInProgress) {
                log.debug('Sync no longer in progress, so ending sync loop.');

                return;
            }

            log.trace('Check sync status');

            ethereumNode.send('eth_syncing', [])
                .then((ret) => {
                    const result = ret.result;

                    // got a result, check for error
                    if (result) {
                        log.trace('Sync status', result);

                        // got an error?
                        if (result.error) {
                            if (result.error.code === -32601) {
                                log.warn('Sync method not implemented, skipping sync.');

                                return this._onSyncDone();
                            } else {
                                throw new Error(`Unexpected error: ${result.error}`);
                            }
                        }
                        // no error, so call again in a bit
                        else {
                            this.emit('nodeSyncing', result);

                            return this._sync();
                        }
                    }
                    // got no result, let's check the block number
                    else {
                        log.debug('Check latest block number');

                        return ethereumNode.send('eth_getBlockByNumber', ['latest', false])
                            .then((ret) => {
                                const blockResult = ret.result;

                                const now = Math.floor(new Date().getTime() / 1000);

                                const diff = now - +blockResult.timestamp;

                                log.debug(`Last block: ${blockResult.number}, ${diff}s ago`);

                                // need sync if > 1 minute
                                if (diff > 60) {
                                    this.emit('nodeSyncing', result);

                                    log.trace('Keep syncing...');

                                    return this._sync();
                                } else {
                                    log.info('No more sync necessary');

                                    return this._onSyncDone();
                                }
                            });
                    }
                })
                .catch((err) => {
                    log.error('Node crashed while syncing?', err);

                    this._onSyncError(err);
                });
        }, SYNC_CHECK_INTERVAL_MS);
    }


    _onNodeStateChanged(state) {
        switch (state) {
            // stop syncing when node about to be stopped
        case ethereumNode.STATES.STOPPING:
            log.info('Ethereum node stopping, so stop sync');

            this.stop();
            break;
            // auto-sync whenever node gets connected
        case ethereumNode.STATES.CONNECTED:
            log.info('Ethereum node connected, re-start sync');

                // stop syncing, then start again
            this.stop().then(() => {
                this.start();
            });
            break;
        }
    }
}


module.exports = new NodeSync();
