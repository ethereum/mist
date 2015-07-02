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


    /**
    Connects to a socket


    @param {Object} event     If the event param is present it assumes its a sync request and will return the writable property, using "event.returnValue"
    @method connect
    */
    GethConnection.prototype.connect = function(event){

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
                .replace(/\}\]\[\{/g,'}]|--|[{') // }][{
                .replace(/\}\[\{/g,'}|--|[{') // }[{
                .replace(/\}\]\{/g,'}]|--|{') // }]{
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

    /**
    This will close the socket connection and prevent any further activity with it.

    @method destroy
    */
    GethConnection.prototype.destroy = function() {
        this.ipcSocket.removeAllListeners();
        this.ipcSocket.destroy();

        this.timeout();

        delete global.sockets['id_'+ this.sender.getId()];
    };



    /**
    The IPC listeners

    @class ipcProvider Backend
    @constructor
    */

    // wait for incoming requests from dapps/ui
    ipc.on('ipcProvider-create', function(event){
        var socket = global.sockets['id_'+ event.sender.getId()];
        if(socket && socket.destroyed) return;

        if(socket)
            socket.connect(event);
        else {
            global.sockets['id_'+ event.sender.getId()] = new GethConnection(event);
        }
    });

    ipc.on('ipcProvider-destroy', function(event){
        var socket = global.sockets['id_'+ event.sender.getId()];
        if(socket && socket.destroyed) return;

        if(socket) {
            socket.destroy();
        }
    });


    var sendRequest = function(event, payload, sync) {
        var socket = global.sockets['id_'+ event.sender.getId()];
        if(socket && socket.destroyed) return;

        if(!socket)
            // TODO: should we really try to reconnect, after the connection was destroyed?
            // socket = global.sockets['id_'+ event.sender.getId()] = new GethConnection(event);
            return;
        // make sure we are connected
        else
            socket.connect();

        var jsonPayload = JSON.parse(payload),
            filteredPayload = socket.filterRequest(jsonPayload);


        // SEND REQUEST
        if(!_.isEmpty(filteredPayload)) {
            var id = filteredPayload.id || filteredPayload[0].id;

            console.log('IPCSOCKET '+ socket.sender.getId() +' WRITE'+ (sync ? ' SYNC' : '') + ' ID:' + id + ' Method: '+ (filteredPayload.method || filteredPayload[0].method));

            event.method = filteredPayload.method || filteredPayload[0].method;
            event.batchPayload = _.isArray(filteredPayload);

            if(sync)
                socket.syncEvents[id] = event;
            else
                socket.asyncEvents[id] = event;

            socket.ipcSocket.write(JSON.stringify(filteredPayload));
        
        // ERROR
        } else {
            var id = jsonPayload.id || jsonPayload[0].id;

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