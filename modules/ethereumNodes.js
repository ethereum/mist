/**
@module ethereumNodes
*/

const _ = require('underscore');
const fs = require('fs');
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

    @method _startProcess
    */
    _startProcess: function(type, testnet, binPath, pw, callback, popupCallback){
        var _this = this,
            cbCalled = false,
            error = false;

        console.log('Starting '+ type +' node...');

        // wrap the starting callback
        var callCb = function(err, res){

            // set standard node
            fs.writeFile(global.path.USERDATA + '/node', type, function(err) {
                if(!err) {
                    console.log('Saved standard node "'+ type +'" to file: '+ global.path.USERDATA + '/node');
                } else {
                    console.log(err);
                }

            });

            cbCalled = true;
            if(err)
                error = true;
            callback(err, res);
        };



        // START TESTNET
        if(testnet) {
            args = (type === 'geth') ? ['--testnet'] : ['--morden'];

        // START MAINNET
        } else {
            args = (type === 'geth') ? [] : ['--master', pw];
            pw = null;
        }

        global.nodes[type] = spawn(binPath, args);


        global.nodes[type].once('error',function(){

            error = true;

            if(!cbCalled && _.isFunction(callback)){
                callCb('Couldn\'t start '+ type +' node!');
            }
        });

        global.nodes[type].once('exit',function(){

            // If is eth then the password was typed wrong
            if(!cbCalled && type === 'eth') {
                _this.stopNodes();
                popupCallback('Masterpassword wrong');

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
                // (geth) prevent starying until IPC service is started
                else if(type === 'geth' && data.toString().indexOf('IPC service started') === -1)
                    return;
                else
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