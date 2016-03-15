var ipc = require('electron').ipcRenderer;

module.export = (function() {
    document.addEventListener('DOMContentLoaded', DOMContentLoaded, false);

    function DOMContentLoaded(event) {
        var urlBar = document.querySelector('meta[name="ethereum-dapp-url-bar-style"]');
        console.log('urlBar: ', urlBar.content);

        if(statusBar)
            ipc.sendToHost('urlBar', urlBar.content);
        else
            ipc.sendToHost('urlBar', null);

        document.removeEventListener('DOMContentLoaded', DOMContentLoaded, false);
    }
})();