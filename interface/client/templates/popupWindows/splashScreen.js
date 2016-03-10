/**
Template Controllers

@module Templates
*/

/**
The splashScreen template

@class [template] popupWindows_splashScreen
@constructor
*/

/**
Contains the last state of the data

@property lastData
*/
var lastData = {};


Template['popupWindows_splashScreen'].onCreated(function(){
    var template = this;

    ipc.on('startScreenText', function(e, text, data){
        var translatedText = '';

        if(text === 'logText') {
            TemplateVar.set(template, 'logText', data);
            return;
        }

        // show text
        if(text.indexOf('privateChainTimeout') === -1 &&
           text.indexOf('privateChainTimeoutClear') === -1) {
            translatedText = TAPi18n.__(text);
            TemplateVar.set(template, 'text', translatedText);
        }


        // make window closeable and image smaller on TIMEOUT
        if(text.indexOf('nodeConnectionTimeout') !== -1 ||
           text.indexOf('nodeBinaryNotFound') !== -1 ||
           text.indexOf('nodeSyncing') !== -1 ||
           text.indexOf('privateChainTimeout') !== -1) {

            // make icon small
            TemplateVar.set(template, 'smallClass', 'small');


            // SHOW SYNC STATUS
            if(text.indexOf('nodeSyncing') !== -1) {
                lastData = _.extend(lastData, data || {});
                var progress = ((lastData.currentBlock - lastData.startingBlock) / (lastData.highestBlock - lastData.startingBlock)) * 100;

                lastData._currentBlock = lastData.currentBlock;
                lastData._highestBlock = lastData.highestBlock;
                lastData.currentBlock = numeral(lastData.currentBlock).format('0,0');
                lastData.highestBlock = numeral(lastData.highestBlock).format('0,0');

                if(progress === 0)
                    progress = 1;

                // improve time format
                // lastData.timeEstimate = lastData.timeEstimate.replace('h','h ').replace('m','m ').replace(/ +/,' ');

                // show node info text
                if(lastData.startingBlock) {
                    // show progress bar
                    TemplateVar.set(template, 'showProgressBar', true);
                    TemplateVar.set(template, 'logText', false);

                    if(lastData._highestBlock - lastData._currentBlock < 2500)
                        translatedText += '<br><small>'+ TAPi18n.__('mist.startScreen.nodeSyncProcessing') +'</small>';
                    else
                        translatedText += '<br><small>'+ TAPi18n.__('mist.startScreen.nodeSyncInfo', lastData) +'</small>';
                }
                
                TemplateVar.set(template, 'text', translatedText);


                // set progress value
                if(_.isFinite(progress))
                    TemplateVar.set(template, 'progress', progress);


            // HIDE PRIVATE chain text
            } else if(text.indexOf('privateChainTimeoutClear') !== -1) {
                TemplateVar.set(template, 'showStartAppButton', false);


            // SHOW PRIVATE chain text
            } else if(text.indexOf('privateChainTimeout') !== -1) {
                
                TemplateVar.set(template, 'startAppButtonText', TAPi18n.__(text));
                TemplateVar.set(template, 'showStartAppButton', true);


            // on ERROR MAKE CLOSEABLE
            } else {
                // show text with path
                TemplateVar.set(template, 'text', TAPi18n.__(text, {path: data}));
            }
        }

    });
});

Template['popupWindows_splashScreen'].helpers({
    /**
    Returns the current splash screen mode

    @method mode
    */
    'mode': function(){
        return mode;
    },
    /**
    Returns the icon path

    @method iconPath
    */
    'iconPath': function(){
        return 'file://'+ dirname +'icons/'+ mode +'/icon2x.png';
    }
});

Template['popupWindows_splashScreen'].events({
   'click .close': function(){
        ipc.send('backendAction_closeApp');
   },
   'click .start-app': function(){
        ipc.send('backendAction_startApp');
   } 
});
