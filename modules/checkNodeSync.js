/**
The checkNodeSync module,
checks the current node whether its synching or not and how much it kept up already.

@module checkNodeSync
*/

const _ = require('underscore');
const app = require('app');
const ipc = require('electron').ipcMain;

// var dechunker = require('./ipc/dechunker.js');

/**
Check if the nodes needs sync and start the app

@method checkNodeSync
*/
module.exports = function(appStartWindow, callbackSplash, callbackOnBoarding){
    var intervalId,
        timeoutId,
        cbCalled = false;


    console.log('Checking node sync status...');

    global.nodeConnector.connect();

    global.nodeConnector.send('eth_accounts', [], function(e, result){
        
        // start on boarding screen
        if(!e && global.nodes.geth && result && result.length === 0) {
        
            callbackOnBoarding();

        // show progress in start screen
        } else {

            // check last block time
            global.nodeConnector.send('eth_getBlockByNumber', ['latest', false], function(e, result){
                var now = Math.floor(new Date().getTime() / 1000);

                console.log('Time between last block', (now - +result.timestamp) + 's');

                // need sync if > 2 minutes
                if(now - +result.timestamp > 60 * 2) {

                    intervalId = setInterval(function(){
                        
                        // get the latest sync status
                        if(global.nodeConnector.socket.writable) {
                            global.nodeConnector.send('eth_syncing', [], cb);
                        }
                    }, 50);


                // start app
                } else {
                    console.log('No sync necessary, starting app!');
                    callbackSplash();
                    cbCalled = true;
                }
            });
        }
    });



    var cb = function(error, result){
    
        // error occured, ignore
        if(result.error) {
            // if sync method is not implemented, just start the app
            if(result.error.code === -32601) {
                console.log('Syncing method not implemented, start app anyway.');

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
                console.log('Sync finished, starting app!');

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
};