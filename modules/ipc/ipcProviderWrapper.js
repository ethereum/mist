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
Gets the new handle. Either null, or some dummy handle, to fake the real `net._handle`.

@method on('ipcProvider-setHandle')
*/
ipc.on('ipcProvider-setHandle', function(handle){
    ipcProviderWrapper._handle = handle;
});


ipcProviderWrapper = {
    _handle: null,

    /**
    Connects the IPC on the backend to the geth node

    @method connect
    */
    connect: function(path) {
        
        ipc.send('ipcProvider-create', path);

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
        return ipc.sendSync('ipcProvider-writeSync', payload);
    }

};


module.exports = ipcProviderWrapper;