/**
The checkNodeSync module,
checks the current node whether its synching or not and how much it kept up already.

@module checkNodeSync
*/

const _ = require('underscore');
const Q = require('bluebird');
const app = require('app');
const ipc = require('electron').ipcMain;
const ethereumNode = require('./ethereumNode');
const log = require('./utils/logger').create('NodeSync');


class NodeSync {
    /**
     * @return {Promise}
     */
    run () {
        log.info('Checking node sync status...');

        if (!ethereumNode.isIpcConnected) {
            return Q.reject(new Error('Not yet connected to node via IPC'));
        }

        return new Q((resolve, reject) => {
            this._doLoop(resolve, reject);
        });
    }

    _doLoop (onDone, onError) {
        log.debug('Get last obtained block');

        ethereumNode.send('eth_getBlockByNumber', ['latest', false])
            .then((result) => {
                const now = Math.floor(new Date().getTime() / 1000);

                const lastBlockTime = parseInt(Math.abs(result.timestamp));

                const diff = now - lastBlockTime;

                log.debug(`Time since last block: ${diff}s`);

                // need sync if > 1 minutes
                if(diff > 60) {
                    log.info('Sync necessary, starting now...');

                    this._startSync(onDone, onError);
                } else {
                    log.info('No sync necessary, starting app');

                    onDone();
                }
            });
    }



    var cb = function(error, result){
    
        // error occured, ignore
        if(error || (result && result.error)) {
            // if sync method is not implemented, just start the app
            if(result && result.error.code === -32601) {
                log.info('Syncing method not implemented, start app anyway.');

                clearInterval(intervalId);
                clearTimeout(timeoutId);
                callbackSplash();
                cbCalled = true;
            }

            if(error) {
                log.error('Node crashed while syncing?');

                clearInterval(intervalId);
                clearTimeout(timeoutId);
                callbackSplash();
                cbCalled = true;
            }

            return;
        }
            

        // CHECK BLOCK (AGAIN)
        if(_.isString(result.hash)) {
            var now = Math.floor(new Date().getTime() / 1000);

            // If ready!
            if(now - +result.timestamp < 120 && !cbCalled) {
                log.info('Sync finished, starting app!');

                clearInterval(intervalId);
                clearTimeout(timeoutId);
                callbackSplash();

                // prevent double call of the callback
                cbCalled = true;

            // if still needs syncing
            } else {
                if(appStartWindow && appStartWindow.webContents && !appStartWindow.webContents.isDestroyed())
                    appStartWindow.webContents.send('startScreenText', 'mist.startScreen.nodeSyncing', {
                        currentBlock: +result.number
                    });
            }


        // CHECK SYNC STATUS
        } else {
            
            // if not syncing anymore
            if(!result) {

                global.nodeConnector.send('eth_getBlockByNumber', ['latest', false], cb);

                // create timeout for private chains, where no one is mining
                if(!timeoutId) {
                    timeoutId = setTimeout(function(){
                        if(appStartWindow && appStartWindow.webContents && !appStartWindow.webContents.isDestroyed()) {
                            appStartWindow.webContents.send('startScreenText', 'mist.startScreen.privateChainTimeout');

                            ipc.on('backendAction_startApp', function() {
                                clearInterval(intervalId);
                                callbackSplash();

                                // prevent double call of the callback
                                cbCalled = true;

                                ipc.removeAllListeners('backendAction_startApp');
                            });
                        }
                    }, 1000 * 12);
                }
            
            // update progress bar
            } else {

                // clear timeout if blocks start to get imported
                clearTimeout(timeoutId);
                timeoutId = null;
                
                if(appStartWindow && appStartWindow.webContents && !appStartWindow.webContents.isDestroyed()) {
                    // remove the private chain button again
                    appStartWindow.webContents.send('startScreenText', 'mist.startScreen.privateChainTimeoutClear');
                    appStartWindow.webContents.send('startScreenText', 'mist.startScreen.nodeSyncing', result);
                }
                    
            }

        }
    };
}


module.exports = new NodeSync();



