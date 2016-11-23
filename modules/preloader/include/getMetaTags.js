/**
Gest the meta[name="ethereum-dapp-url-bar-style"] meta tag

@module getMetaTags
*/

const  { ipcRenderer: ipc } = require('electron');

module.export = (function () {
    document.addEventListener('DOMContentLoaded', DOMContentLoaded, false);

    function DOMContentLoaded(event) {
        const appBar = document.querySelector('meta[name="ethereum-dapp-url-bar-style"]');

        if (appBar)
            { ipc.sendToHost('appBar', appBar.content); }
        else
            { ipc.sendToHost('appBar', null); }

        document.removeEventListener('DOMContentLoaded', DOMContentLoaded, false);
    }
}());
