/**
@module MistUI
*/

/**
The IPC provider wrapper to communicate to the backend

@class ipcProviderWrapper
@constructor
*/

const electron = require('electron');
const ipc = electron.ipcRenderer;


/**
Gets the writable property.

@method on('ipcProvider-setWritable')
*/
ipc.on('ipcProvider-setWritable', function(e, writable){
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
    @param {String} name `connect`, `error`, `end`, `timeout` or `data`
    @param  {Funciton} callback
    */
    on: function(name, callback) {
        ipc.on('ipcProvider-'+ name, function(e, result){
            callback(result);
        });
    },
    /**
    Removes listener

    @method removeListener
    */
    removeListener: function(type, callback){
        ipc.removeListener('ipcProvider-'+ type, callback);
    },

    /**
    Removes all listeners

    @method removeAllListeners
    */
    removeAllListeners: function(type){
        ipc.removeAllListeners('ipcProvider-'+ type);
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