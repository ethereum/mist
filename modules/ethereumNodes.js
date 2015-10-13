/**
@module ethereumNodes
*/

const _ = require('underscore');
const app = require('app');
const path = require('path');
const spawn = require('child_process').spawn;
const ipc = require('ipc');
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
            global.nodes.geth.kill('SIGKILL');
            global.nodes.geth = null;
        }

        // kill running eth
        if(global.nodes.eth) {
            global.nodes.eth.stderr.removeAllListeners('data');
            global.nodes.eth.stdout.removeAllListeners('data');
            global.nodes.eth.stdin.removeAllListeners('error');
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

        var binPath = binaryPath + '/'+ type +'/'+ type +'';

        if(global.production)
            binPath = binPath.replace('app.asar/','');


        if(process.platform === 'win32')
            binPath += '.exe';

        if(process.platform === 'linux')
            binPath = type; // simply try to run a global binary


        if(type === 'eth') {

            var modalWindow = createPopupWindow.show('unlockMasterPassword', 400, 220, null, null, true);
            modalWindow.on('closed', function() {
                if(!called)
                    app.quit();
            });

            ipc.once('uiAction_unlockedMasterPassword', function(ev, err, result){
                if(modalWindow.webContents && ev.sender.getId() === modalWindow.webContents.getId()) {
                    if(!err) {
                        _this._startProcess(type, testnet, binPath, result, callback);

                    } else {
                        app.quit();
                    }

                    result = null;
                    called = true;
                    modalWindow.close();
                    modalWindow = null;
                }
            });
        } else {
            _this._startProcess(type, testnet, binPath, null, callback);
        }

        return global.nodes[type];
    },
    /**

    @method _startProcess
    */
    _startProcess: function(type, testnet, binPath, pw, callback){
        var cbCalled = false,
            error = false;

        console.log('Starting '+ type +' node...');


        // START TESTNET
        if(testnet) {
            args = (type === 'geth') ? ['--testnet'] : ['--morden'];

        // START MAINNET
        } else {
            args = (type === 'geth') ? [] : ['--master', pw];
        }

        global.nodes[type] = spawn(binPath, args);

        global.nodes[type].on('error',function(e){
            console.log('Couldn\'t start '+ type +' node!', e);

            error = true;

            if(!cbCalled && _.isFunction(callback)){
                callback('Couldn\'t start '+ type +' node!');
                cbCalled = true;
            }
        });

        // we need to read the buff to prevent geth/eth from stop working
        global.nodes[type].stdout.on('data', function() {
            if(!cbCalled && _.isFunction(callback)){
                callback(null);
                cbCalled = true;
            }

            // console.log('stdout',String(chunk));
        });
        global.nodes[type].stderr.on('data', function() {
            if(!cbCalled && _.isFunction(callback)) {
                callback(null);
                cbCalled = true;
            }
            // console.log('stderr',String(chunk));
        });

        // confirm to the disclaimer
        if(type === 'geth') {
            setTimeout(function(){
                if(!error)
                    global.nodes[type].stdin.write("y\r\n");
            }, 10);
        }
    }
};