const ipc = require('ipc');
const i18n = require('../../modules/i18n.js');

ipc.on('startScreenText', function(text, path){
    document.getElementById('text').innerHTML = i18n.t(text, {path: path});

    // make window closeable and image smaller on TIMEOUT
    if(text.indexOf('connectionTimeout') !== -1) {
        document.getElementById('image').className = 'small';
        
        document.getElementsByTagName('body')[0].className = 'clickable';

        document.getElementsByTagName('body').addEventListener('click', function(){
            ipc.send('closeApp');
        }, false);
    }
});