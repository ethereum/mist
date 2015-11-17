/**
@module ethereumNodes
*/

const _ = require('underscore');
const fs = require('fs');
const app = require('app');
const path = require('path');
const spawn = require('child_process').spawn;
const ipc = require('electron').ipcMain;
const createPopupWindow = require('./createPopupWindow.js');

const binaryPath = path.resolve(__dirname + '/../nodes');

module.exports = {
    /**
    Stop all running nodes.

    @method stopNodes
    */
    stopNodes: function() {
        console.log('Stopping nodes...');

        // kill running geth
        if(global.nodes.geth) {
            global.nodes.geth.stderr.removeAllListeners('data');
            global.nodes.geth.stdout.removeAllListeners('data');
            global.nodes.geth.stdin.removeAllListeners('error');
            global.nodes.geth.removeAllListeners('error');
            global.nodes.geth.removeAllListeners('exit');
            global.nodes.geth.kill('SIGKILL');
            global.nodes.geth = null;
        }

        // kill running eth
        if(global.nodes.eth) {
            global.nodes.eth.stderr.removeAllListeners('data');
            global.nodes.eth.stdout.removeAllListeners('data');
            global.nodes.eth.stdin.removeAllListeners('error');
            global.nodes.eth.removeAllListeners('error');
            global.nodes.eth.removeAllListeners('exit');
            global.nodes.eth.kill('SIGKILL');
            global.nodes.eth = null;
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

        var binPath = (!global.production)
            ? binaryPath + '/'+ type +'/'+ process.platform +'-'+ process.arch + '/'+ type
            : binaryPath.replace('nodes','node') + '/'+ type +'/'+ type;

        if(global.production)
            binPath = binPath.replace('app.asar/','').replace('app.asar\\','');


        if(process.platform === 'win32') {
            binPath = binPath.replace(/\/+/,'\\');
            binPath += '.exe';
        }

        // if(process.platform === 'linux')
        //     binPath = type; // simply try to run a global binary


        console.log('Start node from '+ binPath);

        if(type === 'eth') {

            var modalWindow = createPopupWindow.show('unlockMasterPassword', 400, 220, null, null, true);
            modalWindow.on('closed', function() {
                if(!called)
                    app.quit();
            });

            var popupCallback = function(e){
                if(!e) {
                    called = true;
                    modalWindow.close();
                    modalWindow = null;
                    ipc.removeAllListeners('uiAction_unlockedMasterPassword');

                } else if(modalWindow) {
                    modalWindow.webContents.send('data', {masterPasswordWrong: true});
                }
            };

            ipc.on('uiAction_unlockedMasterPassword', function(ev, err, result){
                if(modalWindow.webContents && ev.sender.getId() === modalWindow.webContents.getId()) {

                    if(!err) {
                        _this._startProcess(type, testnet, binPath, result, callback, popupCallback);

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
            error = false;

        this.stopNodes();

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
            args = (type === 'geth') ? ['--testnet'] : ['--morden', '--unsafe-transactions'];

        // START MAINNET
        } else {
            args = (type === 'geth') ? [] : ['--unsafe-transactions', '--master', pw];
            pw = null;
        }

        global.nodes[type] = spawn(binPath, args);


        // node has a problem starting
        global.nodes[type].once('error',function(e){
            error = true;

            if(!cbCalled && _.isFunction(callback)){
                callCb('Couldn\'t start '+ type +' node!');
            }
        });

        // node quit, e.g. master pw wrong
        global.nodes[type].once('exit',function(){

            // If is eth then the password was typed wrong
            if(!cbCalled && type === 'eth') {
                _this.stopNodes();

                if(popupCallback)
                    popupCallback('Masterpassword wrong');

                // set default to geth, to prevent beeing unable to start the wallet
                _this._writeNodeToFile('geth', testnet);

                console.log('Password wrong '+ type +' node!');
            }
        });

        // we need to read the buff to prevent geth/eth from stop working
        global.nodes[type].stdout.on('data', function(data) {

            // console.log('stdout ', data.toString());
            if(!cbCalled && _.isFunction(callback)){

                // (eth) prevent starting, when "Ethereum (++)" didn't appear yet (necessary for the master pw unlock)
                if(type === 'eth' && data.toString().indexOf('Ethereum (++)') === -1)
                    return;
                else if(popupCallback)
                    popupCallback(null);

                callCb(null);
            }
        });
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


        // confirm to the disclaimer in geth
        if(type === 'geth') {
            setTimeout(function(){
                if(!error)
                    global.nodes[type].stdin.write("y\r\n");
            }, 10);
        }
    }
};