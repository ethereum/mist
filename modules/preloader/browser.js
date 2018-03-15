/**
@module preloader browser
*/
const _ = require('underscore');
require('./include/common')('browser');
const { ipcRenderer, webFrame, remote } = require('electron');
const mist = require('./include/mistAPI.js');
require('./include/getFavicon.js');
require('./include/getMetaTags.js');
require('./include/setBasePath')('interface');
const packageJson = require('./../../package.json');
const fs = remote.require('fs');
const path = remote.require('path');

// set navigator.language
Object.defineProperty(navigator, 'language', {
  get() {
    return ipcRenderer.sendSync('backendAction_getLanguage');
  }
});

// notifiy the tab to store the webview id
ipcRenderer.sendToHost('setWebviewId');

const isValidJsonRpc = function(message) {
  return !!(
    Object.prototype.hasOwnProperty.call(message, 'method') ||
    Object.prototype.hasOwnProperty.call(message, 'id') ||
    Object.prototype.hasOwnProperty.call(message, 'params') ||
    Object.prototype.hasOwnProperty.call(message, 'jsonrpc')
  );
};

const sanatizeJsonRpc = function(message) {
  // sanitize
  return {
    jsonrpc: message.jsonrpc,
    id: message.id,
    method: message.method,
    params: message.params
  };
};

// Wait for post messages
window.addEventListener('message', function message(event) {
  let data;
  try {
    data = JSON.parse(event.data);
  } catch (e) {
    data = event.data;
  }

  if (typeof data !== 'object') {
    return;
  }

  // EthereumProvider: connect
  if (data.type === 'create') {
    ipcRenderer.send('ipcProvider-create');

    // EthereumProvider: write
  } else if (data.type === 'write') {
    let messageIsArray = _.isArray(data.message);

    // only accept valid JSON rpc requests
    if (messageIsArray) {
      for (let i = 0; i < data.message.length; i++) {
        if (isValidJsonRpc(data.message[i])) {
          data.message[i] = sanatizeJsonRpc(data.message[i]);
        } else {
          return;
        }
      }
    } else {
      if (isValidJsonRpc(data.message)) {
        data.message = sanatizeJsonRpc(data.message);
      } else {
        return;
      }
    }

    // make sure we only send allowed properties
    ipcRenderer.send('ipcProvider-write', JSON.stringify(data.message));

    // mistAPI
  } else if (/^mistAPI_[a-z]/i.test(data.type)) {
    if (data.type === 'mistAPI_requestAccount') {
      ipcRenderer.send(data.type, data.message);
    } else {
      ipcRenderer.sendToHost(data.type, data.message);
    }
  }
});

const postMessage = function(payload) {
  if (typeof payload === 'object') {
    payload = JSON.stringify(payload);
  }

  window.postMessage(
    payload,
    !location.origin || location.origin === 'null' ? '*' : location.origin
  );
};

// custom Events
['uiAction_windowMessage', 'mistAPI_callMenuFunction'].forEach(function(type) {
  ipcRenderer.on(type, function onIpcRenderer(e, result) {
    // this type needs special packaging
    if (type === 'uiAction_windowMessage') {
      result = {
        type: arguments[1],
        error: arguments[2],
        value: arguments[3]
      };
    }

    postMessage({
      type: type,
      message: result
    });
  });
});

// add IPCbackend events
['data', 'error', 'end', 'timeout', 'connect'].forEach(function(type) {
  ipcRenderer.on(`ipcProvider-` + type, function onIpcRenderer(e, result) {
    postMessage({
      type: type,
      message: JSON.parse(result)
    });
  });
});

// load ethereumProvider
const bignumber = fs
  .readFileSync(path.join(__dirname, '/injected/BigNumber.js'))
  .toString();
const eventEmitter3 = fs
  .readFileSync(path.join(__dirname, '/injected/EventEmitter3.js'))
  .toString();
let mistAPI = fs
  .readFileSync(path.join(__dirname, '/injected/mistAPI.js'))
  .toString();
const ethereumProvider = fs
  .readFileSync(path.join(__dirname, '/injected/EthereumProvider.js'))
  .toString();

mistAPI = mistAPI
  .replace('__version__', packageJson.version)
  .replace('__license__', packageJson.license)
  .replace('__platform__', process.platform)
  .replace(
    '__solidityVersion__',
    String(packageJson.dependencies.solc).match(/\d+\.\d+\.\d+/)[0]
  );

webFrame.executeJavaScript(
  mistAPI + bignumber + eventEmitter3 + ethereumProvider
);

// notifiy the tab to store the webview id
ipcRenderer.sendToHost('setWebviewId');

// destroy the old socket
ipcRenderer.send('ipcProvider-destroy');
