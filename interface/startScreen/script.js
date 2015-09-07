const _ = require('underscore');
const ipc = require('ipc');
const i18n = require('../../modules/i18n.js');

var lastData = {},
    highestBlocksAvailable = 0;

ipc.on('startScreenText', function(text, data){

    // show text
    document.getElementById('text').innerHTML = i18n.t(text);


    // make window closeable and image smaller on TIMEOUT
    if(text.indexOf('nodeConnectionTimeout') !== -1 ||
       text.indexOf('nodeBinaryNotFound') !== -1 ||
       text.indexOf('nodeSyncing') !== -1) {

        // make icon small
        document.getElementsByTagName('body')[0].className = 'small';


        // SHOW SYNC STATUS
        if(text.indexOf('nodeSyncing') !== -1) {
            var progress = ((lastData.lastBlockNumber - lastData.startBlockNumber) / highestBlocksAvailable) * 100;
            lastData = _.extend(lastData, data);

            if(lastData.blocksAvailable > highestBlocksAvailable)
                highestBlocksAvailable = lastData.blocksAvailable;

            // improve time format
            lastData.timeEstimate = lastData.timeEstimate.replace('h','h ').replace('m','m ').replace(/ +/,' ');

            // startBlockNumber
            if(!highestBlocksAvailable)
                document.getElementById('text').innerHTML += '<br><small>'+ i18n.t('mist.startScreen.nodeSyncConnecting') +'</small>';
            else
                document.getElementById('text').innerHTML += '<br><small>'+ i18n.t('mist.startScreen.nodeSyncInfo', lastData) +'</small>';
            
            // show progress bar
            if(document.getElementsByTagName('progress')[0].className.indexOf('visible') === -1)
                document.getElementsByTagName('progress')[0].className += ' visible';

            // set progress value
            if(_.isFinite(progress))
                document.getElementsByTagName('progress')[0].value = progress;
        
        // on ERROR MAKE CLOSEABLE
        } else {
            
            document.getElementsByTagName('body')[0].className += ' clickable';
            document.getElementsByTagName('body')[0].addEventListener('click', function(){
                ipc.send('closeApp');
            }, false);

            // show text with path
            document.getElementById('text').innerHTML = i18n.t(text, {path: data});
        }
    }

});