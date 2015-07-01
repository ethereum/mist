/**
The IPC provider backend filter and tunnel all incoming request to the IPC geth bridge.

@module ipcProviderBackend
*/

// make sockets globally available
global.sockets = {};

module.exports = function(mainWindow){
    const _ = require('underscore');
    const ipc = require('ipc');
    const net = require('net');
    const Socket = net.Socket;
    const getIpcPath = require('./getIpcPath.js');

    var errorMethod = '{"jsonrpc": "2.0", "error": {"code": -32601, "message": "Method \'__method__\' not allowed."}, "id": "__id__"}',
        errorTimeout = '{"jsonrpc": "2.0", "error": {"code": -32603, "message": "Request timed out for method  \'__method__\'"}, "id": "__id__"}',
        ipcPath = getIpcPath();



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
    var GethConnection = function(event) {
        this.ipcSocket = new Socket();
        this.path = ipcPath;
        this.syncEvents = {};
        this.asyncEvents = {};


        this.sender = event.sender;
        this.lastChunk = null;
        this.lastChunkTimeout = null;


        this.ipcSocket.setEncoding('utf8');
        // this.ipcSocket.setKeepAlive(true, 1000 * 5);
        // this.ipcSocket.setTimeout(1000 * 10);
        // this.ipcSocket.setNoDelay(false);

        // setup socket
        this.connect(event);
        this.setupSocket();


        return this;
    };

    GethConnection.prototype.connect = function(event){
        var _this = this;

        if(!this.ipcSocket.writable) {

            console.log('IPCSOCKET '+ this.sender.getId() +' CONNECTING..');

            this.ipcSocket = this.ipcSocket.connect({path: this.path});
        }

        if(event)
            event.returnValue = this.ipcSocket.writable;
        else
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
            return payload;

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
        

        this.ipcSocket.on("connect", function(){
            _this.sender.send('ipcProvider-setWritable', _this.ipcSocket.writable);
        });

        // wait for data on the socket
        this.ipcSocket.on("data", function(data){

            // DE-CHUNKER
            var dechunkedData = data
                .replace(/\}\{/g,'}|--|{') // }{
                .replace(/\}\]\[\{/g,'}]|--|[{') // ][
                .replace(/\}\[\{/g,'}|--|[{') // }[
                .replace(/\}\]\{/g,'}]|--|{') // ]{
                .split('|--|');

            for (var i = 0; i < dechunkedData.length; i++) {
                data = dechunkedData[i];
console.log('IPCSOCKET '+ _this.sender.getId()  +' RESPONSE', data);
                // prepend the last chunk
                if(_this.lastChunk)
                    data = _this.lastChunk + data;

                var result = data;
                    id = null;


                try {
                    result = JSON.parse(result);

                } catch(e) {
                    _this.lastChunk = data;

                    console.log('IPCSOCKET '+ _this.sender.getId() +' PARSE ERROR', e, "'''"+ data +"'''");

                    // start timeout to cancel all requests
                    clearTimeout(_this.lastChunkTimeout);
                    _this.lastChunkTimeout = setTimeout(function(){
                        console.log('IPCSOCKET '+ _this.sender.getId() +' TIMEOUT ERROR', e, "'''"+ data +"'''");
                        _this.timeout();
                    }, 1000 * 15);

                    return;
                }

                // cancel timeout and set chunk to null
                clearTimeout(_this.lastChunkTimeout);
                _this.lastChunk = null;


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

                // console.log('IPCSOCKET '+ _this.sender.getId() +' RESPONSE', result);


                // SEND SYNC back
                if(_this.syncEvents[id]) {
                    _this.syncEvents[id].returnValue = data;
                    delete _this.syncEvents[id];

                // SEND async back
                } else if(_this.asyncEvents[id]) {
                    _this.asyncEvents[id].sender.send('ipcProvider-data', data);
                    delete _this.asyncEvents[id];
                }
            };
        });


        this.ipcSocket.on("error", function(data){

            console.log('IPCSOCKET '+ _this.sender.getId() +' ERROR', data);

            _this.sender.send('ipcProvider-setWritable', _this.ipcSocket.writable);
            _this.sender.send('ipcProvider-error', data);


            // if(data.code === 'ECONNREFUSED') {
            //     _this.destroy();
            // }

            _this.timeout();
        });

        // this.ipcSocket.on('drain', function(data){
        //     console.log('IPCSOCKET '+ _this.sender.getId() +' DRAINED');
        // });

        this.ipcSocket.on('end', function(){
            console.log('IPCSOCKET '+ _this.sender.getId() +' CONNECTION ENDED');

            _this.sender.send('ipcProvider-setWritable', _this.ipcSocket.writable);
            _this.sender.send('ipcProvider-end');

            _this.timeout();
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
    ipc.on('ipcProvider-create', function(event){
        var socket = global.sockets['id_'+ event.sender.getId()];

        if(socket)
            socket.connect(event);
        else {
            global.sockets['id_'+ event.sender.getId()] = new GethConnection(event);
        }
    });

    ipc.on('ipcProvider-destroy', function(event){
        var socket = global.sockets['id_'+ event.sender.getId()];

        if(socket) {
            socket.destroy();
            delete global.sockets['id_'+ event.sender.getId()];
        }
    });


    var sendRequest = function(event, payload, sync) {
        var socket = global.sockets['id_'+ event.sender.getId()];

        if(!socket) 
            socket = global.sockets['id_'+ event.sender.getId()] = new GethConnection(event.sender);

        // make sure we are connected
        socket.connect();

        var jsonPayload = JSON.parse(payload),
            id = jsonPayload.id || jsonPayload[0].id;


        var filteredPayload = socket.filterRequest(jsonPayload);

        console.log('IPCSOCKET '+ socket.sender.getId() +' WRITE'+ (sync ? ' SYNC' : '') + ' ID:' + id + ' Method: '+ (jsonPayload.method || jsonPayload[0].method));

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
};