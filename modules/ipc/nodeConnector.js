/**
@module Node Connector
*/

const _ = require('underscore');
const dechunker = require('./dechunker.js');
const newSocket = require('./socket.js');
const log = require('../utils/logger').create('nodeConnector');
var idCount = 1;

/**
The node connection, is a wrapper for the JSON RPC to execute commands on the node

@class NodeConnector
@constructor
*/
var NodeConnector = function(ipcPath) {
    var _this = this;
    this.socket = newSocket(ipcPath);
    this.ipcPath = ipcPath;
    this.callbacks = {};

    // error
    this.socket.on('error', function(error){
        log.warn('NODECONNECTOR ERROR', error);
    });

    // wait for data on the socket
    this.socket.on('data', function(data){
        dechunker(data, function(error, result){
            if(error) {
                log.error('NODECONNECTOR TIMEOUT ERROR', error);
                _.each(_this.callbacks, function(cb){
                    cb(error);
                });
                _this.callbacks = {};
                return;
            }

            var cb = _this.callbacks[result.id];

            if(_.isFunction(cb))
                cb(null, result.result);
        });
    });

};

NodeConnector.prototype.connect = function() {
     if(!this.socket.writable)
        this.socket.connect({path: this.ipcPath});
};

NodeConnector.prototype.send = function(name, params, callback) {
    if(this.socket.writable) {
        this.socket.write(JSON.stringify({
            jsonrpc: '2.0',
            id: idCount,
            method: name,
            params: params || []
        }));

        if(_.isFunction(callback))
            this.callbacks[idCount] = callback;

        idCount++
    } else {
        callback('Socket not writeable');
    }
};

NodeConnector.prototype.destroy = function() {
    this.socket.destroy();
};



module.exports = NodeConnector;
