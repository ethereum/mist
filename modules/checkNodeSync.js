/**
The checkNodeSync module,
checks the current node whether its synching or not and how much it kept up already.

@module checkNodeSync
*/

const _ = require('underscore');
const ipc = require('ipc');

var dechunker = require('./ipc/dechunker.js');

/**
Check if the nodes needs sync and start the app

@method checkNodeSync
*/
module.exports = function(socket, appStartWindow, callback){
    var idCount = 1,
        getLatestBlock = {
            jsonrpc: '2.0',
            id: idCount,
            method: 'eth_getBlockByNumber',
            params: ['latest', false]
        },
        intervalId,
        timeoutId,
        cbCalled = false;


    console.log('Checking node sync status...');

    socket.on("data", function(data){
        dechunker(data, function(error, result){
        
            if(error) {
                console.error('Error: couldn\'t decode node response!', e);
                callback(error);
                return;
            }

            // error occured, ignore
            if(result.error) {
                // if sync method is not implemented, just start the app
                if(result.error.code === -32601) {
                    console.log('Syncing method not implemented, start app anyway.');

                    clearInterval(intervalId);
                    clearTimeout(timeoutId);
                    callback();
                    cbCalled = true;
                }

                return;
            }


            // FIRST BLOCK arrived
            if(result.id === 1) {
                var now = Math.floor(new Date().getTime() / 1000);

                console.log('Time between last block', (now - +result.result.timestamp) + 's');

                // need sync if > 2 minutes
                if(now - +result.result.timestamp > 60 * 2) {

                    intervalId = setInterval(function(){
                        idCount++;

                        // get the latest sync status
                        socket.write(JSON.stringify({
                            jsonrpc: '2.0',
                            id: idCount,
                            method: 'eth_syncing',
                            params: []
                        }));
                    }, 50);


                // start app
                } else {
                    console.log('No sync necessary, starting app!');
                    callback();
                    cbCalled = true;
                }

            // CHECK BLOCK (AGAIN)
            } else if(_.isString(result.result.hash)) {
                var now = Math.floor(new Date().getTime() / 1000);

                // If ready!
                if(now - +result.result.timestamp < 120 && !cbCalled) {
                    console.log('Sync finished, starting app!');

                    clearInterval(intervalId);
                    callback();

                    // prevent double call of the callback
                    cbCalled = true;

                // if still needs syncing
                } else {
                    if(appStartWindow && appStartWindow.webContents)
                        appStartWindow.webContents.send('startScreenText', 'mist.startScreen.nodeSyncing', {
                            currentBlock: +result.result.number
                        });
                }


            // CHECK SYNC STATUS
            } else {
                
                // if not syncing anymore
                if(!result.result) {
                    getLatestBlock.id = ++idCount;
                    socket.write(JSON.stringify(getLatestBlock));

                    // create timeout for private chains, where no one is mining
                    if(!timeoutId) {
                        timeoutId = setTimeout(function(){
                            if(appStartWindow && appStartWindow.webContents) {
                                appStartWindow.webContents.send('startScreenText', 'mist.startScreen.privateChainTimeout');

                                ipc.on('uiAction_startApp', function() {
                                    clearInterval(intervalId);
                                    callback();

                                    // prevent double call of the callback
                                    cbCalled = true;
                                });
                            }
                        }, 1000 * 10);
                    }
                
                // update progress bar
                } else {

                    // clear timeout if blocks start to get imported
                    clearTimeout(timeoutId);
                    timeoutId = null;
                    
                    // remove the private chain button again
                    appStartWindow.webContents.send('startScreenText', 'mist.startScreen.privateChainTimeoutClear');

                    if(appStartWindow && appStartWindow.webContents)
                        appStartWindow.webContents.send('startScreenText', 'mist.startScreen.nodeSyncing', result.result);
                }

            }
        });
    });

    // get the latest block and compare timestamp
    socket.write(JSON.stringify(getLatestBlock));
};