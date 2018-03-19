const { ipcRenderer } = require('electron');

const extractLineNumberFromStack = function(stack) {
  // / <summary>
  // / Get the line/filename detail from a Webkit stack trace.  See http://stackoverflow.com/a/3806596/1037948
  // / </summary>
  // / <param name="stack" type="String">the stack string</param>

  let line = stack.split('\n')[2];
  // fix for various display text
  if (line) {
    line =
      line.indexOf(' (') >= 0
        ? line.split(' (')[1].substring(0, line.length - 1)
        : line.split('at ')[1];
    return line;
  }
};

module.exports = function(windowId) {
  if (typeof window === 'undefined') {
    return;
  }

  windowId = windowId || window.location.url;

  const console = window.console;

  // send console logging to IPC backend
  ['trace', 'debug', 'info', 'warn', 'error', 'log'].forEach(method => {
    console[`_${method}`] = console[method];
    console[method] = (function(origMethod) {
      return function() {
        const args = Array.from(arguments);

        const suffix = `@ ${
          this.lineNumber
            ? `${this.fileName}:${this.lineNumber}:1`
            : extractLineNumberFromStack(new Error().stack)
        }`;

        origMethod.apply(console, args.concat([suffix]));

        try {
          ipcRenderer.send(
            'console_log',
            windowId,
            method === 'log' ? 'info' : method,
            JSON.stringify(args)
          );
        } catch (err) {
          console._warn(
            'Unable to stringify arguments to log to backend',
            err.stack
          );
        }
      };
    })(console[method]);
  });
};
