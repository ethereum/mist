/**
@module MistUI
*/

/**
The IPC provider wrapper to communicate to the backend

@class ipcProviderWrapper
@constructor
*/

const ipc = require('ipc');


/**
Gets the writable property.

@method on('ipcProvider-setWritable')
*/
ipc.on('ipcProvider-setWritable', function(writable){
    ipcProviderWrapper.writable = writable;
});

ipcProviderWrapper = {
    writable: false,

    /**
    Connects the IPC on the backend to the geth node

    Note: web3.isConnected will always return true, as otherwise race conditions can occour,
    letting it look like youre not connected via IPC.

    @method connect
    */
    connect: function(path) {
        // console.log('CONNECT SYNC');
        this.writable = ipc.sendSync('ipcProvider-create'); // path is set in the backend
        // ipc.send('ipcProvider-create'); // path is set in the backend

        return this;
    },
    /**
    Returns data from the IPC through the backend

    @method on
    */
    on: function(name, callback) {
        if(name === 'data'){
            ipc.on('ipcProvider-data', callback);

            // rely to all webviews
        }

        if(name === 'error'){
            ipc.on('ipcProvider-error', callback);
        }

        // dont send the end connection error
        // if(name === 'end'){
        //     ipc.on('ipcProvider-end', callback);
        // }
    },
    /**
    Write to the IPC connection through the backend

    @method write
    */
    write: function (payload) {
        ipc.send('ipcProvider-write', payload);
    },
    /**
    Write synchronous to the IPC connection through the backend

    @method writeSync
    */
    writeSync: function (payload) {
        // console.log('SEND SYNC', payload);
        return ipc.sendSync('ipcProvider-writeSync', payload);
    }

};


module.exports = ipcProviderWrapper;