/**
@module MistBackend
*/

/**
The IPC provider backend filter and tunnel all incoming request to the IPC geth bridge.

@class ipcProviderBackend
@constructor
*/

const _ = require('underscore');
const ipc = require('ipc');
const net = require('net');
const Socket = net.Socket;

var mainWindow = null,
    sockets = {};
    errorMethod = '{"jsonrpc": "2.0", "error": {"code": -32601, "message": "Method \'__method__\' not allowed."}, "id": "__id__"}';
    errorTimeout = '{"jsonrpc": "2.0", "error": {"code": -32603, "message": "Request timed out for method  \'__method__\'"}, "id": "__id__"}';



var testRequests = function(payload){
    if(/^eth_|^shh_|^net_|^web3_|^db_/.test(payload.method)){
        return payload;
    } else {
        return false;
    }
};


/**
The IPC wrapper backend, handling one socket connection per view

@class GethConnection
@constructor
*/
var GethConnection = function(sender, path) {
    this.ipcSocket = new Socket(),
    this.sender = sender,
    this.path = path,
    this.syncEvents = {},
    this.asyncEvents = {},


    this.sender = sender;


    // this.ipcSocket.setKeepAlive(true, 1000 * 5);
    // this.ipcSocket.setTimeout(1000 * 10);
    // this.ipcSocket.setNoDelay(true);

    // setup socket
    this.connect();
    this.setupSocket();


    return this;
};

GethConnection.prototype.connect = function(){
    var _this = this;

    if(!this.ipcSocket.writable) {

        console.log('IPCSOCKET '+ this.sender.getId() +' CONNECTING..');

        this.ipcSocket = this.ipcSocket.connect({path: this.path}, function(){
            // send writabel property
            // event.returnValue = _this.ipcSocket.writable;
            _this.sender.send('ipcProvider-setWritable', _this.ipcSocket.writable);
        });

    }

    this.sender.send('ipcProvider-setWritable', this.ipcSocket.writable);
};

/**
Send Request filter

@method filterRequest
@param {Object} the payload
@return {Boolean} TRUE when its a valid allowed request, otherWise FALSE
*/
GethConnection.prototype.filterRequest = function(payload) {
    if(!_.isObject(payload))
        return false;

    if(this.sender.getId() === mainWindow.webContents.getId())
        return true;

    if(_.isArray(payload)) {
        return _.filter(payload, function(load){
            return testRequests(load);
        });
    } else {
        return testRequests(payload);
    }

};


/**
Creates the socket and sets up the listeners.

@method setupSocket
*/
GethConnection.prototype.setupSocket = function() {
    var _this = this;
    

    // wait for data on the socket
    this.ipcSocket.on("data", function(data){
        var result =  data.toString(),
            id = null;

        try {
            result = JSON.parse(result);

        } catch(e) {
        }


        // get the id which matches the returned id
        if(_.isArray(result)) {
            _.find(result, function(load){
                var resultId = load.id;

                if(_this.syncEvents[resultId]) {
                    id = resultId;
                    return true;
                }
                if(_this.asyncEvents[resultId]) {
                    id = resultId;
                    return true;
                }
                return false;
            });
        } else {
            id = result.id;
        }

        // TODO set buffer size
        console.log('IPCSOCKET '+ _this.sender.getId() +' RESPONSE', result);
        console.log(result.id, _this.asyncEvents, id);

        // SEND SYNC back
        if(_this.syncEvents[id]) {
            _this.syncEvents[id].returnValue = data.toString();
            delete _this.syncEvents[id];

        // SEND async back
        } else if(_this.asyncEvents[id]) {
            _this.asyncEvents[id].sender.send('ipcProvider-data', data.toString());
            delete _this.asyncEvents[id];
        }
    });


    this.ipcSocket.on("error", function(data){

        console.log('IPCSOCKET '+ _this.sender.getId() +' ERROR', data, data.toString());

        _this.sender.send('ipcProvider-error', data);

        // _this.destroy();
        _this.timeout();
        _this.connect();
    });


    this.ipcSocket.on('end', function(data){
        console.log('IPCSOCKET '+ _this.sender.getId() +' CONNECTION ENDED');
    });

};

GethConnection.prototype.timeout = function() {
    var _this = this;
    
    this.sender.send('ipcProvider-setWritable', _this.ipcSocket.writable);

    // cancel all requests
    _.each(this.asyncEvents, function(event, key){
        var error = (event.batchPayload) ? '['+ errorTimeout +']' : errorTimeout;

        event.sender.send('ipcProvider-data', error.replace('__id__', key).replace('__method__', event.method));
        delete _this.asyncEvents[key];
    });
    _.each(this.syncEvents, function(event, key){
        var error = (event.batchPayload) ? '['+ errorTimeout +']' : errorTimeout;

        event.returnValue = error.replace('__id__', key).replace('__method__', event.method);
        delete _this.syncEvents[key];
    });
};

GethConnection.prototype.destroy = function() {
    this.ipcSocket.destroy();
    this.timeout();
};




// wait for incoming requests from dapps/ui
ipc.on('ipcProvider-create', function(event, options){
    var socket = sockets['id_'+ event.sender.getId()];

    if(socket)
        socket.connect();
    else {
        sockets['id_'+ event.sender.getId()] = new GethConnection(event.sender, options.path);
    }
});

ipc.on('ipcProvider-destroy', function(event, options){
    var socket = sockets['id_'+ event.sender.getId()];

    if(socket) {
        socket.destroy();
        delete sockets['id_'+ event.sender.getId()];
    }
});


var sendRequest = function(event, payload, sync) {
    var socket = sockets['id_'+ event.sender.getId()];

    if(!socket) 
        socket = sockets['id_'+ event.sender.getId()] = new GethConnection(event.sender, options.path);

    // make sure we are connected
    socket.connect();

    var jsonPayload = JSON.parse(payload),
        id = jsonPayload.id || jsonPayload[0].id;


    var filteredPayload = socket.filterRequest(jsonPayload);

    console.log('IPCSOCKET '+ socket.sender.getId() +' WRITE'+ (sync ? ' SYNC' : ''), JSON.stringify(jsonPayload, null, 2));

    // SEND REQUEST
    if(!_.isEmpty(filteredPayload)) {
        socket.ipcSocket.write(JSON.stringify(filteredPayload));
        event.method = jsonPayload.method || jsonPayload[0].method;
        event.batchPayload = _.isArray(filteredPayload);

        if(sync)
            socket.syncEvents[id] = event;
        else
            socket.asyncEvents[id] = event;
    
    // ERROR
    } else {
        if(sync)
            event.returnValue = errorMethod.replace('__id__', id).replace('__method__', jsonPayload.method || jsonPayload[0].method);
        else
            event.sender.send('ipcProvider-data', errorMethod.replace('__id__', id).replace('__method__', jsonPayload.method || jsonPayload[0].method));
    }
}

ipc.on('ipcProvider-write', sendRequest);

ipc.on('ipcProvider-writeSync', function(event, payload){
    sendRequest(event, payload, true);
});



module.exports = function(givenWindow){
    mainWindow = givenWindow;
};