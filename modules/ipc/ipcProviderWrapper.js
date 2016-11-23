/**
@module MistUI
*/

/**
The IPC provider wrapper to communicate to the backend

@class ipcProviderWrapper
@constructor
*/

const { ipcRenderer: ipc } = require('electron');


/**
Gets the writable property.

@method on('ipcProvider-setWritable')
*/
ipc.on('ipcProvider-setWritable', (e, writable) => {
    // console.debug('ipcProvider-setWritable', writable);

    ipcProviderWrapper.writable = writable;
});


const ipcProviderWrapper = {
    writable: false,

    /**
    Connects the IPC on the backend to the geth node

    Note: web3.isConnected will always return true, as otherwise race conditions can occour,
    letting it look like youre not connected via IPC.

    @method connect
    */
    connect(path) {
        // console.debug('ipcProviderWrapper: connect');

        ipc.send('ipcProvider-create', path);

        return this;
    },
    /**
    Returns data from the IPC through the backend

    @method on
    @param {String} name `connect`, `error`, `end`, `timeout` or `data`
    @param  {Funciton} callback
    */
    on(name, callback) {
        // console.debug('ipcProviderWrapper: add listener', name);

        ipc.on(`ipcProvider-${name}`, (e, result) => {
            callback(result);
        });
    },
    /**
    Returns data from the IPC through the backend

    @method once
    @param {String} name `connect`, `error`, `end`, `timeout` or `data`
    @param  {Funciton} callback
    */
    once(name, callback) {
        // console.debug('ipcProviderWrapper: add listener', name);

        ipc.once(`ipcProvider-${name}`, (e, result) => {
            callback(result);
        });
    },
    /**
    Removes listener

    @method removeListener
    */
    removeListener(name, callback) {
        // console.debug('ipcProviderWrapper: remove listener', name);

        ipc.removeListener(`ipcProvider-${name}`, callback);
    },

    /**
    Removes all listeners

    @method removeAllListeners
    */
    removeAllListeners(name) {
        // console.debug('ipcProviderWrapper: remove all listeners', name);

        if (name) {
            ipc.removeAllListeners(`ipcProvider-${name}`);
        } else {
            ipc.removeAllListeners('ipcProvider-error');
            ipc.removeAllListeners('ipcProvider-end');
            ipc.removeAllListeners('ipcProvider-timeout');
            ipc.removeAllListeners('ipcProvider-connect');
        }
    },
    /**
    Write to the IPC connection through the backend

    @method write
    */
    write(payload) {
        // console.debug('ipcProviderWrapper: write payload');

        ipc.send('ipcProvider-write', payload);
    },
    /**
    Write synchronous to the IPC connection through the backend

    @method writeSync
    */
    writeSync(payload) {
        // console.debug('ipcProviderWrapper: write payload (sync)');

        return ipc.sendSync('ipcProvider-writeSync', payload);
    },

};


module.exports = ipcProviderWrapper;
