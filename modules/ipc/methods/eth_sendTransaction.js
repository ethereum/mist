"use strict";

const BaseProcessor = require('./base');
const Windows = require('../../windows');
const Q = require('bluebird');
const electron = require('electron');
const ipc = electron.ipcMain;


/**
 * Process method: eth_sendTransaction
 */
module.exports = class extends BaseProcessor {
    /**
     * @override
     */
    exec (conn, payload) {
        return new Q((resolve, reject) => {
            this._log.info('Ask user for password');

            this._log.info(payload.params[0]);

            // validate data
            try {
                _.each(payload.params[0], (val) => {
                    // if doesn't have hex then leave
                    if(_.isString(val)) {
                        if (val.match(/[^0-9a-fx]/igm)) {
                            throw this.ERRORS.INVALID_PAYLOAD;
                        }
                    }
                });                
            } catch (err) {
                return reject(err);
            }

            let modalWindow = Windows.createPopup('sendTransactionConfirmation', {
                sendData: ['data', payload.params[0]],
                electronOptions: {
                    width: 580, 
                    height: 550, 
                    alwaysOnTop: true,
                },
            });

            modalWindow.on('closed', () => {
                // user cancelled?
                if (!modalWindow.processed) {
                    reject(this.ERRORS.METHOD_DENIED);
                }
            });

            ipc.once('backendAction_unlockedAccountAndSentTransaction', (ev, err, result) => {
                if (Windows.getById(ev.sender.getId()) === modalWindow 
                        && !modalWindow.isClosed) 
                {
                    if(err || !result) {
                        this._log.debug('Confirmation error', err);

                        reject(err || this.ERRORS.METHOD_DENIED);
                    } else {
                        this._log.info('Transaction sent', result);

                        resolve(result);
                    }

                    modalWindow.processed = true;
                    modalWindow.close();
                }
            });
        })
        .then((result) => {
            return _.extend({}, payload, {
                result: result
            });
        });
    }
}
