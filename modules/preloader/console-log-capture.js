const ipc = require('electron').ipcRenderer;

module.exports = function(windowId) {
    if (typeof window === 'undefined') {
        return;
    }

    windowId = windowId || window.location.url;

    let console = window.console;

    // send console logging to IPC backend
    ['trace', 'debug', 'info', 'warn', 'error', 'log'].forEach(function(method) {
        console['orig_' + method] = console[method];
        console[method] = (function(origMethod) {
            return function() {
                origMethod.apply(console, arguments);

                try {
                    ipc.send('console_log', windowId, ('log' === method ? 'info' : method), 
                        JSON.stringify(arguments)
                    );                    
                } catch (err) {
                    console.orig_error('Unable to stringify arguments to log to backend', err.stack);
                }

            }
        })(console[method]);
    });             
};

