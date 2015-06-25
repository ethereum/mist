/**
@module MistBackend
*/

/**
The IPC provider backend filter and tunnel all incoming request to the IPC geth bridge.

@class ipcProviderBackend
@constructor
*/

const ipc = require('ipc');
const net = require('net');
const _ = require('underscore');

var Socket = net.Socket,
    ipcSocket = new Socket(),
    senderList = {},
    syncEvents = {},
    asyncSenders = {},
    mainWindow = null,
    errorMethod = '{"jsonrpc": "2.0", "error": {"code": -32601, "message": "Method \'__method__\' not found"}, "id": "__id__"}';
    errorTimeout = '{"jsonrpc": "2.0", "error": {"code": -32603, "message": "Request timed out"}, "id": "__id__"}';



/**
Send Request filter

@method filterRequest
@param {Object} the payload
@param {Object} the event.sender of the request
@return {Boolean} TRUE when its a valid allowed request, otherWise FALSE
*/
var filterRequest = function(payload, sender) {
    if(!_.isObject(payload) || !payload.method)
        return false;

    if(sender.getId() === mainWindow.webContents.getId())
        return true;
    else
        return /^eth_|^shh_|^net_|^web3_|^db_/.test(payload.method);
};


// wait for data on the socket
ipcSocket.on("data", function(data){
    var result =  data.toString();

    try {
        var result = JSON.parse(result);

    } catch(e) {
    }

    var id;

    // get the id which matches the returned id
    if(typeof result === 'object' && result[0]) {
        result.forEach(function(load){
            if(syncEvents[load.id])
                id = load.id;
            if(asyncSenders[load.id])
                id = load.id;
        });
    } else {
        id = result.id;
    }

    // SEND SYNC back
    if(syncEvents[id]) {
        syncEvents[id].returnValue = data.toString();
        delete syncEvents[id];

    // SEND async back
    } else if(asyncSenders[id]) {
        asyncSenders[id].send('ipcProvider-data', data.toString());
        delete asyncSenders[id];
    }
});
ipcSocket.on("error", function(data){

    console.log('ERROR', data, data.toString());

    _.each(senderList, function(sender) {
        sender.send('ipcProvider-error', data);
        sender.send('ipcProvider-setWritable', null);
    });

});


ipcSocket.on('end', function(data){
    console.log('END CONNECTION', data);
    _.each(senderList, function(sender) {
        sender.send('ipcProvider-setWritable', null);
    });

    // cancel all requests
    _.each(asyncSenders, function(sender, key){
        sender.send('ipcProvider-data', errorTimeout.replace('__id__', key));
        delete asyncSenders[key];
    });
    _.each(syncEvents, function(event, key){
        event.returnValue = errorTimeout.replace('__id__', key);
        delete syncEvents[key];
    });
});



// wait for incoming requests from dapps/ui
ipc.on('ipcProvider-create', function(event, options){
    var dummyHandle = {fd: true};

    senderList['id_'+ event.sender.getId()] = event.sender;

    if(!ipcSocket.writable) {
        event.sender.send('ipcProvider-setWritable', null);

        ipcSocket = ipcSocket.connect({path: options.path}, function(){
            // send fake handle
            event.sender.send('ipcProvider-setWritable', dummyHandle);
            // event.returnValue = dummyHandle;
        });



        // timeout connection
        // setTimeout(function() {
            // event.returnValue = dummyHandle;
        // }, 1000);

    } else {
        event.sender.send('ipcProvider-setWritable', dummyHandle);
    }
});



ipc.on('ipcProvider-write', function(event, payload){

    var jsonPayload = JSON.parse(payload),
        id = jsonPayload.id || jsonPayload[0].id;

    if(filterRequest(jsonPayload, event.sender)) {
        ipcSocket.write(payload);
        asyncSenders[id] = event.sender;
    } else {
        event.sender.send('ipcProvider-data', errorMethod.replace('__id__', id).replace('__method__', jsonPayload.method));
    }
});



ipc.on('ipcProvider-writeSync', function(event, payload){

    var jsonPayload = JSON.parse(payload),
        id = jsonPayload.id || jsonPayload[0].id;

    if(filterRequest(jsonPayload, event.sender)) {
        ipcSocket.write(payload);
        syncEvents[id] = event;
    } else {
        event.returnValue = errorMethod.replace('__id__', id).replace('__method__', jsonPayload.method);
    }
});

module.exports = function(givenWindow){
    mainWindow = givenWindow;
};