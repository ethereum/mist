/**
Gets the favicon url

@module getFavicon
*/

const { ipcRenderer: ipc } = require('electron');

(function () {
    document.addEventListener('DOMContentLoaded', DOMContentLoaded, false);

    function DOMContentLoaded(event) {
        const icon = document.querySelector('link[rel="apple-touch-icon"]') || document.querySelector('link[type="image/x-icon"]') || document.querySelector('link[rel="shortcut"]') || document.querySelector('link[rel="shortcut icon"]') || document.querySelector('link[rel="icon"]');

        if (icon)
            { ipc.sendToHost('favicon', icon.href); }
        else
            { ipc.sendToHost('favicon', null); }

        document.removeEventListener('DOMContentLoaded', DOMContentLoaded, false);
    }
}());
