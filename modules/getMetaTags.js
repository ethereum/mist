var ipc = require('electron').ipcRenderer;

module.export = (function() {
    document.addEventListener('DOMContentLoaded', DOMContentLoaded, false);

    function DOMContentLoaded(event) {
        var appBar = document.querySelector('meta[name="ethereum-dapp-url-bar-style"]');
        console.log('appBar: ', appBar.content);

        if(appBar)
            ipc.sendToHost('appBar', appBar.content);
        else
            ipc.sendToHost('appBar', null);

        document.removeEventListener('DOMContentLoaded', DOMContentLoaded, false);
    }
})();