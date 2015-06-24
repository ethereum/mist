const ipc = require('ipc');
const net = require('net');
const _ = require('underscore');

var Socket = net.Socket,
    ipcSocket = new Socket(),
    senderList = {},
    syncEvents = {},
    asyncSenders = {},
    window = null;


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
// ipcSocket.on("error", function(data){

//     _.each(senderList, function(sender) {
//         sender.send('ipcProvider-error', data);
//         sender.send('ipcProvider-setHandle', null);
//     });

// });
ipcSocket.on('end', function(){
    _.each(senderList, function(sender) {
        sender.send('ipcProvider-setHandle', null);
    });
});

// wait for incoming requests from dapps/ui
ipc.on('ipcProvider-create', function(event, options){
    var dummyHandle = {fd: true};

    senderList['id_'+ event.sender.getId()] = event.sender;

    if(!ipcSocket._handle) {
        event.sender.send('ipcProvider-setHandle', null);

        ipcSocket.connect({path: options.path}, function(){
            // send fake handle
            event.sender.send('ipcProvider-setHandle', dummyHandle);
            // event.returnValue = dummyHandle;
        });
            

        // timeout connection
        // setTimeout(function() {
        //     event.returnValue = null;
        // }, 1000);

    } else {
        event.sender.send('ipcProvider-setHandle', dummyHandle);
    }
});
ipc.on('ipcProvider-write', function(event, payload){

    // TODO: filter requests, disallow admin_

    ipcSocket.write(payload);

    var jsonPayload = JSON.parse(payload),
        id = jsonPayload.id || jsonPayload[0].id;

    asyncSenders[id] = event.sender;
});
ipc.on('ipcProvider-writeSync', function(event, payload){

    // TODO: filter requests, disallow admin_

    ipcSocket.write(payload);

    var jsonPayload = JSON.parse(payload),
        id = jsonPayload.id || jsonPayload[0].id;
    
    syncEvents[id] = event;
});

module.exports = function(givenWindow){
    window = givenWindow;
};