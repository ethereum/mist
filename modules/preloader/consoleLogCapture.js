const ipc = require('electron').ipcRenderer;


const extractLineNumberFromStack = function (stack) {
    /// <summary>
    /// Get the line/filename detail from a Webkit stack trace.  See http://stackoverflow.com/a/3806596/1037948
    /// </summary>
    /// <param name="stack" type="String">the stack string</param>

    var line = stack.split('\n')[2];
    // fix for various display text
    line = (line.indexOf(' (') >= 0
        ? line.split(' (')[1].substring(0, line.length - 1)
        : line.split('at ')[1]
        );
    return line;
};



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
                let args = Array.from(arguments);

                let suffix = "@ " + 
                    (this.lineNumber
                        ? this.fileName + ':' + this.lineNumber + ":1"
                        : extractLineNumberFromStack(new Error().stack)
                    )
                ;

                origMethod.apply(console, args.concat([suffix]));

                try {
                    ipc.send(
                        'console_log', 
                        windowId,
                        ('log' === method ? 'info' : method), 
                        JSON.stringify(args)
                    );                    
                } catch (err) {
                    console.orig_error('Unable to stringify arguments to log to backend', err.stack);
                }
            };
        })(console[method]);
    });             
};

