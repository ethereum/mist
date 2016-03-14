/**
@module ethereumNodes
*/

const _ = require('underscore');
const fs = require('fs');
const app = require('app');
const spawn = require('child_process').spawn;
const ipc = require('electron').ipcMain;
const getNodePath = require('./getNodePath.js');
const popupWindow = require('./popupWindow.js');
const logRotate = require('log-rotate');

module.exports = {
    /**
    Stop all running nodes.

    @method stopNodes
    */
    stopNodes: function(callback) {
        console.log('Stopping nodes...');

        var node = global.nodes.geth || global.nodes.eth;

        // kill running geth
        if(node) {
            node.stderr.removeAllListeners('data');
            node.stdout.removeAllListeners('data');
            node.stdin.removeAllListeners('error');
            node.removeAllListeners('error');
            node.removeAllListeners('exit');
            node.kill('SIGINT');

            // kill if not closed already
            var timeoutId = setTimeout(function(){
                node.kill('SIGKILL');
                if(_.isFunction(callback))
                    callback();

                node = null;
            }, 8000);

            node.once('close', function(){
                clearTimeout(timeoutId);
                if(_.isFunction(callback))
                    callback();

                node = null;
            });

        } else {
            if(_.isFunction(callback))
                callback();
        }
    },
    /**
    Starts a node of type

    @method startNode
    @param {String} type the node e.g. "geth" or "eth"
    @param {Boolean} testnet
    @param {Function} callback will be called after successfull start
    */
    startNode: function(type, testnet, callback){
        var _this = this,
            called = false;

        var binPath = getNodePath(type);

        console.log('Start node from '+ binPath);

        if(type === 'eth') {

            var modalWindow = popupWindow.show('unlockMasterPassword', {width: 400, height: 220, alwaysOnTop: true}, null, null, true);
            modalWindow.on('closed', function() {
                if(!called)
                    app.quit();
            });

            var popupCallback = function(e){
                if(!e) {
                    called = true;
                    modalWindow.close();
                    modalWindow = null;
                    ipc.removeAllListeners('backendAction_unlockedMasterPassword');

                } else if(modalWindow && modalWindow.webContents) {
                    if(e === 'noBinary') {
                        modalWindow.close();
                        modalWindow = null;
                    } else {
                        modalWindow.webContents.send('data', {masterPasswordWrong: true});
                    }
                }
            };

            ipc.on('backendAction_unlockedMasterPassword', function(ev, err, pw){
                if(modalWindow.webContents && ev.sender.getId() === modalWindow.webContents.getId()) {

                    if(!err) {
                        _this._startProcess(type, testnet, binPath, pw, callback, popupCallback);
                    } else {
                        app.quit();
                    }

                    result = null;
                }
            });
        } else {
            _this._startProcess(type, testnet, binPath, null, callback);
        }

        return global.nodes[type];
    },
    /**
    Writes the node type, which will be started on next start to a file.

    @method _writeNodeToFile
    */
    _writeNodeToFile: function(writeType, testnet){
        // set standard node
        fs.writeFile(global.path.USERDATA + '/node', writeType, function(err) {
            if(!err) {
                console.log('Saved standard node "'+ writeType +'" to file: '+ global.path.USERDATA + '/node');
            } else {
                console.log(err);
            }
        });

        // set the global varibale to testnet
        global.network = testnet ? 'test' : 'main';

        // write network type
        fs.writeFile(global.path.USERDATA + '/network', global.network , function(err) {
            if(!err) {
                console.log('Saved network type "'+ global.network +'" to file: '+ global.path.USERDATA + '/network');
            } else {
                console.log(err);
            }
        });
    },
    /**

    @method _startProcess
    */
    _startProcess: function(type, testnet, binPath, pw, callback, popupCallback){
        var _this = this,
            cbCalled = false,
            error = false,
            logfilePath = global.path.USERDATA + '/node.log';


        // rename the old log file
        logRotate(logfilePath, {count: 5}, function(err) {

            var logFile = fs.createWriteStream(logfilePath, {flags: 'a'});

            _this.stopNodes();

            console.log('Starting '+ type +' node...');

            // wrap the starting callback
            var callCb = function(err, res){

                _this._writeNodeToFile(type, testnet);
                
                cbCalled = true;
                if(err)
                    error = true;
                callback(err, res);
            };



            // START TESTNET
            if(testnet) {
                args = (type === 'geth') ? ['--testnet', '--fast'] : ['--morden', '--unsafe-transactions'];

            // START MAINNET
            } else {
                args = (type === 'geth') ? ['--fast', '--cache','512'] : ['--unsafe-transactions', '--master', pw];
                pw = null;
            }

            global.nodes[type] = spawn(binPath, args);


            // node has a problem starting
            global.nodes[type].once('error',function(e){
                error = true;

                if(!cbCalled && _.isFunction(callback)){
                    callCb('Couldn\'t start '+ type +' node!');

                    if(popupCallback) {
                        popupCallback('noBinary');

                        // set default to geth, to prevent beeing unable to start the wallet
                        if(type === 'eth')
                            _this._writeNodeToFile('geth', testnet);
                    }
                }
            });

            // node quit, e.g. master pw wrong
            global.nodes[type].once('exit',function(){

                // If is eth then the password was typed wrong
                if(!cbCalled && type === 'eth') {

                    if(popupCallback)
                        popupCallback('passwordWrong');

                    // set default to geth, to prevent beeing unable to start the wallet
                    _this._writeNodeToFile('geth', testnet);

                    console.log('Password wrong '+ type +' node!');
                }
            });

            // we need to read the buff to prevent geth/eth from stop working
            global.nodes[type].stdout.on('data', function(data) {

                if(!cbCalled && _.isFunction(callback)){

                    // (eth) prevent starting, when "Ethereum (++)" didn't appear yet (necessary for the master pw unlock)
                    if(type === 'eth' && data.toString().indexOf('Ethereum (++)') === -1)
                        return;
                    else if(popupCallback)
                        popupCallback(null);

                    callCb(null);
                }
            });
            // stream log output
            global.nodes[type].stderr.pipe(logFile);
            global.nodes[type].stderr.on('data', function(data) {

                // dont react on stderr when eth++
                if(type === 'eth')
                    return;

                // console.log('stderr ', data.toString());
                if(!cbCalled && _.isFunction(callback)) {

                    // (geth) prevent starying until IPC service is started
                    if(type === 'geth' && data.toString().indexOf('IPC service started') === -1)
                        return;

                    callCb(null);
                }
            });

            
        });
    }
};