/**
Gets the right Node path

@module getFavicon
*/


var ipc = require('electron').ipcRenderer;

(function() {
    document.addEventListener('DOMContentLoaded', DOMContentLoaded, false);

    function DOMContentLoaded(event) {
        var icon = document.querySelector('link[rel="apple-touch-icon"]') || document.querySelector('link[type="image/x-icon"]') || document.querySelector('link[rel="shortcut"]') || document.querySelector('link[rel="shortcut icon"]') || document.querySelector('link[rel="icon"]');
        
        console.log('favicon: ', icon);

        if(icon)
            ipc.sendToHost('favicon', icon.href);
        else
            ipc.sendToHost('favicon', null);

        document.removeEventListener('DOMContentLoaded', DOMContentLoaded, false);
    }
})();