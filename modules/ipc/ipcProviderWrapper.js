/**
@module MistUI
*/

/**
The IPC provider wrapper to communicate to the backend

@class ipcProviderWrapper
@constructor
*/

const { ipcRenderer } = require('electron');

/**
Gets the writable property.

@method on('ipcProvider-setWritable')
*/
ipcRenderer.on('ipcProvider-setWritable', (e, writable) => {
  // console.debug('ipcProvider-setWritable', writable);

  ipcProviderWrapper.writable = writable;
});

const ipcProviderWrapper = {
  writable: false,

  /**
    Connects the IPC on the backend to the geth node

    Note: web3.eth.net.isListening (previously: web3.isConnected) will always return true,
    as otherwise race conditions can occur,
    letting it look like youre not connected via IPC.

    @method connect
  */
  connect(path) {
    // console.debug('ipcProviderWrapper: connect');

    ipcRenderer.send('ipcProvider-create', path);

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

    ipcRenderer.on(`ipcProvider-${name}`, (e, result) => {
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

    ipcRenderer.once(`ipcProvider-${name}`, (e, result) => {
      callback(result);
    });
  },
  /**
    Removes listener

    @method removeListener
    */
  removeListener(name, callback) {
    // console.debug('ipcProviderWrapper: remove listener', name);

    ipcRenderer.removeListener(`ipcProvider-${name}`, callback);
  },

  /**
    Removes all listeners

    @method removeAllListeners
    */
  removeAllListeners(name) {
    // console.debug('ipcProviderWrapper: remove all listeners', name);

    if (name) {
      ipcRenderer.removeAllListeners(`ipcProvider-${name}`);
    } else {
      ipcRenderer.removeAllListeners('ipcProvider-error');
      ipcRenderer.removeAllListeners('ipcProvider-end');
      ipcRenderer.removeAllListeners('ipcProvider-timeout');
      ipcRenderer.removeAllListeners('ipcProvider-connect');
    }
  },
  /**
    Write to the IPC connection through the backend

    @method write
    */
  write(payload) {
    // console.debug('ipcProviderWrapper: write payload');

    ipcRenderer.send('ipcProvider-write', payload);
  },
  /**
    Write synchronous to the IPC connection through the backend

    @method writeSync
    */
  writeSync(payload) {
    // console.debug('ipcProviderWrapper: write payload (sync)');

    return ipcRenderer.sendSync('ipcProvider-writeSync', payload);
  }
};

module.exports = ipcProviderWrapper;
