const GenericProcessor = require('./generic');
const Windows = require('../../windows');
const Q = require('bluebird');


/**
 * Process method: eth_sendTransaction
 */
module.exports = class extends GenericProcessor {
    /**
     * @override
     */
    exec (conn, payload) {
        return new Q((resolve, reject) => {
            this._log.info('Ask user for password');

            let modalWindow = Windows.createPopup('sendTransactionConfirmation', {
                sendData: ['data', payload.params[0]],
                electronOptions: {
                    width: 580, 
                    height: 550, 
                    alwaysOnTop: true,
                },
            });

            modalWindow.on('closed', () => {
                reject(this._ipcProviderBackend.ERRORS.METHOD_DENIED);
            });

            ipc.once('backendAction_unlockedAccountAndSentTransaction', (ev, err, result) => {
                if (ev.sender.getId() === modalWindow.id && !modalWindow.isClosed) {
                    if(err || !result) {
                        this._log.debug('Confirmation error', err);

                        reject(this._ipcProviderBackend.ERRORS.METHOD_DENIED);
                    } else {
                        this._log.info('Transaciton sent', result);

                        resolve(result);
                    }

                    modalWindow.close();
                }
            });
        })
        .catch((err) => {
            throw this._ipcProviderBackend._makeError(payload, err);
        });
    }
}
