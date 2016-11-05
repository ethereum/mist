module.exports = function (windowType) {
    const electron = require('electron');
    const ipc = electron.ipcRenderer;

    if (process.env.TEST_MODE) {
        window.electronRequire = require;
    }

    require('./consoleLogCapture')(windowType);


    // register with window manager
    ipc.send('backendAction_setWindowId');
};
