

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

@property lastSyncData
*/
var lastSyncData = {},
    showNodeLog = true;


Template['popupWindows_splashScreen'].onCreated(function(){
    var template = this;

    ipc.on('uiAction_nodeLogText', function(e, text, data) {
        if (showNodeLog && data) {
            TemplateVar.set(template, 'logText', data);
            return;
        }
    });


    ipc.on('uiAction_nodeStatus', function(e, status, errorTag) {
        console.trace('Node status', status);

        switch (status) {
            case 'starting':
                TemplateVar.set(template, 'text', TAPi18n.__('mist.startScreen.nodeStarting'));
                showNodeLog = true;
                TemplateVar.set(template, 'logText', null);
                TemplateVar.set(template, 'showProgressBar', false);
                TemplateVar.set(template, 'showStartAppButton', false);
                break;

            case 'started':
                TemplateVar.set(template, 'text', TAPi18n.__('mist.startScreen.nodeStarted'));
                break;

            case 'connected':
                TemplateVar.set(template, 'text', TAPi18n.__('mist.startScreen.nodeConnected'));
                lastSyncData = {};
                break;

            case 'stopping':
                TemplateVar.set(template, 'text', TAPi18n.__('mist.startScreen.nodeStopping'));
                TemplateVar.set(template, 'showProgressBar', false);
                TemplateVar.set(template, 'showStartAppButton', false);
                break;

            case 'stopped':
                TemplateVar.set(template, 'text', TAPi18n.__('mist.startScreen.nodeStopped'));
                break;

            case 'connectionTimeout':
                TemplateVar.set(template, 'text', TAPi18n.__('mist.startScreen.nodeConnectionTimeout'));
                break;

            case 'error':
                errorTag = 'mist.startScreen.' + (errorTag || 'nodeError');
                
                TemplateVar.set(template, 'text', TAPi18n.__(errorTag));
                break;
        }
    });

    ipc.on('uiAction_nodeSyncStatus', function(e, status, data) {
        console.trace('Node sync status', status);

        TemplateVar.set(template, 'smallClass', 'small');

        switch (status) {
            case 'inProgress':
                TemplateVar.set(template, 'startAppButtonText', TAPi18n.__('mist.startScreen.launchApp'));
                TemplateVar.set(template, 'showStartAppButton', true);

                showNodeLog = false;

                lastSyncData = _.extend(lastSyncData, data || {});
                var progress = ((lastSyncData.currentBlock - lastSyncData.startingBlock) / (lastSyncData.highestBlock - lastSyncData.startingBlock)) * 100;

                lastSyncData._currentBlock = lastSyncData.currentBlock;
                lastSyncData._highestBlock = lastSyncData.highestBlock;
                lastSyncData.currentBlock = numeral(lastSyncData.currentBlock).format('0,0');
                lastSyncData.highestBlock = numeral(lastSyncData.highestBlock).format('0,0');

                if (progress === 0) {
                    progress = 1;
                }

                var translatedText = '';                    

                // show node info text
                if(lastSyncData.startingBlock) {
                    // show progress bar
                    TemplateVar.set(template, 'showProgressBar', true);

                    if(lastSyncData._highestBlock - lastSyncData._currentBlock < 3000) {
                        translatedText = TAPi18n.__('mist.startScreen.nodeSyncProcessing');
                    } else {
                        translatedText = TAPi18n.__('mist.startScreen.nodeSyncInfo', lastSyncData);
                    }
                } else {
                    translatedText = TAPi18n.__('mist.startScreen.nodeSyncConnecting');                    
                }
                
                TemplateVar.set(template, 'logText', false);
                TemplateVar.set(template, 'text', 
                    TAPi18n.__('mist.startScreen.nodeSyncing') + 
                    '<br /><small>' + translatedText + '</small>'
                );

                // set progress value
                if(_.isFinite(progress)) {
                    TemplateVar.set(template, 'showProgressBar', true);
                    TemplateVar.set(template, 'progress', progress);
                }

                break;
        }
    });

});

Template['popupWindows_splashScreen'].helpers({
    /**
    Returns the current splash screen mode

    @method mode
    */
    'mode': function(){
        return window.mist.mode;
    },
    /**
    Returns the icon path

    @method iconPath
    */
    'iconPath': function(){
        return 'file://'+ window.mist.dirname +'/icons/'+ window.mist.mode +'/icon2x.png';
    }
});


Template['popupWindows_splashScreen'].events({
   'click .start-app': function(){
        ipc.send('backendAction_skipSync');
   } 
});
