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
            id: idCount,
            method: 'eth_getBlockByNumber',
            params: ['latest', false]
        },
        intervalId,
        timeoutId,
        cbCalled = false,
        startBlockNumber = 0,
        lastBlockNumber = 0;


    console.log('Checking node sync status...');

    socket.on("data", function(data){
        dechunker(data, function(error, result){
        
            if(error) {
                console.error('Error: couldn\'t decode node response!', e);
                callback(error);
                return;
            }

            // FIRST BLOCK arrived
            if(result.id === 1) {
                var now = Math.floor(new Date().getTime() / 1000);

                console.log('Time between last block', (now - +result.result.timestamp) + 's');

                // need sync if > 2 minutes
                if(now - +result.result.timestamp > 60 * 2) {

                    lastBlockNumber = +result.result.number;
                    startBlockNumber = lastBlockNumber;

                    intervalId = setInterval(function(){
                        idCount++;

                        // get the latest sync status
                        socket.write(JSON.stringify({
                            id: idCount,
                            method: 'admin_chainSyncStatus',
                            params: []
                        }));
                    }, 200);


                // start app
                } else {
                    console.log('No sync necessary, starting app!');
                    callback();
                    cbCalled = true;
                }


            // CHECK SYNC STATUS
            } else if(_.isFinite(result.result.blocksAvailable)) {

                
                // if blocks are less than 10, check latest block again
                if(result.result.blocksAvailable < 1) {
                    getLatestBlock.id = ++idCount;
                    socket.write(JSON.stringify(getLatestBlock));

                    // create timeout for private chains, where no one is mining
                    if(!timeoutId) {
                        timeoutId = setTimeout(function(){
                            if(appStartWindow && appStartWindow.webContents) {
                                appStartWindow.webContents.send('startScreenText', 'mist.startScreen.privateChainTimeout');

                                ipc.on('startApp', function() {
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
                    
                    // remove the pricvate chain button again
                    appStartWindow.webContents.send('startScreenText', 'mist.startScreen.privateChainTimeoutClear');

                    socket.write(JSON.stringify({
                        id: ++idCount,
                        method: 'eth_blockNumber',
                        params: []
                    }));
                }

                if(appStartWindow && appStartWindow.webContents)
                    appStartWindow.webContents.send('startScreenText', 'mist.startScreen.nodeSyncing', {
                        startBlockNumber: startBlockNumber,
                        lastBlockNumber: lastBlockNumber,
                        blocksAvailable: result.result.blocksAvailable,
                        timeEstimate: result.result.estimate
                    });


            // CHECK BLOCK AGAIN
            } else if(_.isString(result.result.hash)) {
                var now = Math.floor(new Date().getTime() / 1000);

                lastBlockNumber = +result.result.number;

                // need sync if < 120s, start the app
                if(now - +result.result.timestamp < 120 && !cbCalled) {
                    console.log('Sync finished, starting app!');

                    clearInterval(intervalId);
                    callback();

                    // prevent double call of the callback
                    cbCalled = true;
                } else {
                    if(appStartWindow && appStartWindow.webContents)
                        appStartWindow.webContents.send('startScreenText', 'mist.startScreen.nodeSyncing', {
                            startBlockNumber: startBlockNumber,
                            lastBlockNumber: lastBlockNumber
                        });
                }

            // is BLOCK NUMBER
            } else {
                lastBlockNumber = +result.result;
            }
        });
    });

    // get the latest block and compare timestamp
    socket.write(JSON.stringify(getLatestBlock));
};