/**
The IPC provider backend filter and tunnel all incoming request to the IPC geth bridge.

@module ipcProviderBackend
*/

var dechunker = require('./dechunker.js');

/**
make sockets globally available

@property global.sockets
*/
global.sockets = {};


module.exports = function(){
    const _ = require('underscore');
    const ipc = require('ipc');
    const net = require('net');
    const Socket = net.Socket;
    const getIpcPath = require('./getIpcPath.js');

    var errorMethod = {"jsonrpc": "2.0", "error": {"code": -32601, "message": "Method \'__method__\' not allowed."}, "id": "__id__"},
        errorTimeout = {"jsonrpc": "2.0", "error": {"code": -32603, "message": "Request timed out for method  \'__method__\'."}, "id": "__id__"},
        nonExistingRequest = {"jsonrpc": "2.0", "method": "eth_nonExistent", "params": [],"id": "__id__"},
        ipcPath = getIpcPath();


    /**
    Make the error response object.

    @method makeError
    */
    var makeError = function(payload, error) {
        if(error.error)
            error.error.message = error.error.message.replace(/'[a-z_]*'/i, "'"+ payload.method +"'");
        error.id = payload.id;

        return error;
    };

    /**
    Make the error response object for either an error or an batch array of errors

    @method returnError
    */
    var returnError = function(payload, error) {
        if(_.isArray(payload)) {
            return _.map(payload, function(load){
                return makeError(load, error);
            });
        } else {
            return makeError(payload, error);
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
        this.id = event.sender.getId();
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
        var _this = this,
            timeoutId,
            successEventFunc,
            errorEventFunc;

        if(!this.ipcSocket.writable) {

            console.log('IPCSOCKET '+ this.id +' CONNECTING..');

            this.ipcSocket = this.ipcSocket.connect({path: this.path});

            // make sure to set the right writeable
            successEventFunc = function(){
                if(event && timeoutId) {
                    clearTimeout(timeoutId);
                    event.returnValue = true;
                }
                
                _this.ipcSocket.removeListener('error', errorEventFunc);
            };
            this.ipcSocket.once('connect', successEventFunc);

            errorEventFunc = function(){
                if(event && timeoutId) {
                    clearTimeout(timeoutId);
                    event.returnValue = false;
                }
             
                _this.ipcSocket.removeListener('connect', successEventFunc);
            };
            this.ipcSocket.once('error', errorEventFunc);


            // return if it takes to long
            if(event) {
                timeoutId = setTimeout(function(){
                    event.returnValue = _this.ipcSocket.writable;
                    timeoutId = null;
                }, 500);
            }
        
        } else if(event) {
            event.returnValue = true;

        } else {
            this.sender.send('ipcProvider-setWritable', true);
        }

    };

    /**
    Filter requests and responses.

    @method getResponseEvent
    @param {Object} response
    @return {Boolean} TRUE when its a valid allowed request, otherWise FALSE
    */
    GethConnection.prototype.getResponseEvent = function(response) {
        var _this = this;

        if(_.isArray(response)) {
            response = _.find(response, function(load){
                return _this.syncEvents[load.id] || _this.asyncEvents[load.id];
            });
        }


        return (response) ? this.syncEvents[response.id] || this.asyncEvents[response.id] : false;
    };


    /**
    Filter Request and responses filter

    @method testPayload
    @param {Object} payload
    @param {Object} error
    @param {Object} method
    @return {Mixed} The filtered object, an error or false, if forbidden and no error was given.
    */
    GethConnection.prototype.testPayload = function(payload, error, method){

        // Is already ERROR
        if(payload.error) {
            return payload;

        // FILTER REQUESTS
        } else if(payload.method) {

            // prevent dapps from acccesing admin endpoints
            if(!/^eth_|^shh_|^net_|^web3_|^db_/.test(payload.method)){
                payload = error ? returnError(payload, error) : false;
            }

        // FILTER RESULTS
        } else if(payload.result) {

            // stop if no method was given
            if(!method)
                return error ? returnError(payload, error) : false;


            var tab = Tabs.findOne({webviewId: this.id});

            // filter accounts, to allow only allowed accounts
            if(method === 'eth_accounts') {
                if(tab && tab.permissions && tab.permissions.accounts) {
                    payload.result = _.intersection(payload.result, tab.permissions.accounts);
                } else {
                    payload.result = [];
                }
            }
        }

        return payload;
    };

    /**
    Filter requests and responses.

    @method filterRequestResponse
    @param {Object} payload
    @param {Object} event
    @return {Boolean} TRUE when its a valid allowed request, otherWise FALSE
    */
    GethConnection.prototype.filterRequestResponse = function(payload, event) {
        var _this = this;

        if(!_.isObject(payload))
            return false;

        // main window or popupwindows are admin
        if(this.id === global.mainWindow.webContents.getId() ||
           _.contains(global.popupWindows, this.id)) {
            return payload;
        }

        if(_.isArray(payload)) {
            return _.map(payload, function(load){
                var req = event ? _.find(event.payload, function(re){
                    return (re.id === load.id);
                }) : false;
                return _this.testPayload(load, (load.result ? errorMethod : nonExistingRequest), (req ? req.method : false));
            });
        } else {
            return this.testPayload(payload, (payload.result ? errorMethod : false), (event ? event.payload.method : false));
        }

    };


    /**
    Creates the socket and sets up the listeners.

    @method setupSocket
    */
    GethConnection.prototype.setupSocket = function() {
        var _this = this;
        

        this.ipcSocket.on("connect", function(){
            _this.sender.send('ipcProvider-setWritable', true);
        });

        // wait for data on the socket
        this.ipcSocket.on("data", function(data){
            dechunker(data, function(error, result){

                // console.log('IPCSOCKET '+ _this.sender.getId()  +' RESPONSE', data);

                if(error) {
                    console.log('IPCSOCKET '+ _this.id +' TIMEOUT ERROR', error);
                    _this.timeout();
                    return;
                }

                // FILTER RESPONSES
                var event = _this.getResponseEvent(result);

                if(!event)
                    return;

                result = _this.filterRequestResponse(result, event);

                // SEND SYNC back
                if(event.sync) {
                    event.returnValue = JSON.stringify(result);
                    delete _this.syncEvents[event.eventId];

                // SEND async back
                } else {
                    event.sender.send('ipcProvider-data', JSON.stringify(result));
                    delete _this.asyncEvents[event.eventId];
                }
            });
        });


        this.ipcSocket.on("error", function(data){
            try {
                console.log('IPCSOCKET '+ _this.id +' ERROR', data);

                 var id = _this.sender.getId(); // will throw an error, if webview is already closed

                _this.sender.send('ipcProvider-error', data);

                _this.timeout();
            } catch(e) {
                _this.destroy();
            }
        });

        // this.ipcSocket.on('drain', function(data){
        //     console.log('IPCSOCKET '+ _this.sender.getId() +' DRAINED');
        // });

        this.ipcSocket.on('end', function(){
            try {
                console.log('IPCSOCKET '+ _this.id +' CONNECTION ENDED');

                var id = _this.sender.getId(); // will throw an error, if webview is already closed

                _this.sender.send('ipcProvider-end');

                _this.timeout();
            } catch(e) {
                _this.destroy();
            }
        });

    };

    GethConnection.prototype.timeout = function() {
        var _this = this;
        
        this.sender.send('ipcProvider-setWritable', _this.ipcSocket.writable);

        // cancel all requests
        _.each(this.asyncEvents, function(event, key){
            event.sender.send('ipcProvider-data', JSON.stringify(returnError(event.payload, errorTimeout)));
            delete _this.asyncEvents[key];
        });
        _.each(this.syncEvents, function(event, key){
            event.returnValue = JSON.stringify(returnError(event.payload, errorTimeout));
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

        delete global.sockets['id_'+ this.id];

        console.log('SOCKET '+ this.id + ' DESTROYED!');
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
            socket = global.sockets['id_'+ event.sender.getId()] = new GethConnection(event);
        }

      
        // if(event.sender.returnValue)       
        //     event.sender.returnValue = socket.ipcSocket.writable;      
        // else       
        //     event.sender.send('ipcProvider-setWritable', socket.ipcSocket.writable);
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
        else if(!socket.ipcSocket.writable)
            socket.connect();

        var jsonPayload = JSON.parse(payload),
            filteredPayload = socket.filterRequestResponse(jsonPayload);


        // SEND REQUEST
        if(!_.isEmpty(filteredPayload)) {
            var id = filteredPayload.id || filteredPayload[0].id;
            
            // console.log('IPCSOCKET '+ socket.sender.getId() +' ('+ socket.id +') WRITE'+ (sync ? ' SYNC' : '') + ' ID:' + id + ' Method: '+ (filteredPayload.method || filteredPayload[0].method) + ' Params: '+ (filteredPayload.params || filteredPayload[0].params));


            // add the payload to the event, so we can time it out if necessary
            event.payload = filteredPayload;
            event.eventId = id;
            event.sync = !!sync;

            if(sync)
                socket.syncEvents[id] = event;
            else
                socket.asyncEvents[id] = event;

            socket.ipcSocket.write(JSON.stringify(filteredPayload));
        
        // ERROR
        } else {

            if(sync)
                event.returnValue = JSON.stringify(returnError(jsonPayload, errorMethod));
            else
                event.sender.send('ipcProvider-data', JSON.stringify(returnError(jsonPayload, errorMethod)));
        }
    }

    ipc.on('ipcProvider-write', sendRequest);

    ipc.on('ipcProvider-writeSync', function(event, payload){
        sendRequest(event, payload, true);
    });
};