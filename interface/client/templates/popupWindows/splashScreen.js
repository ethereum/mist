

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
    template._intervalId = null;

    ipc.on('uiAction_nodeLogText', function(e, text, data) {
        if (showNodeLog && data) {
            TemplateVar.set(template, 'logText', data);
            TemplateVar.set(template, 'syncStatusMessage', false);

            return;
        }
    });

    ipc.on('uiAction_clientBinaryStatus', function(e, status) {
        TemplateVar.set(template, 'text', TAPi18n.__('mist.startScreen.clientBinaries.' + status));
        TemplateVar.set(template, 'showProgressBar', false);
        TemplateVar.set(template, 'showStartAppButton', false);            
        TemplateVar.set(template, 'logText', null);
    });


    ipc.on('uiAction_nodeStatus', function(e, status, errorTag) {
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
        console.trace('Node sync status', status, data);

        TemplateVar.set(template, 'smallClass', 'small');

        if (status === 'inProgress') {
            TemplateVar.set(template, 'showStartAppButton', true);
            TemplateVar.set(template, 'startAppButtonText', TAPi18n.__('mist.startScreen.launchApp'));

            if (data !== false) {
                // if state is "in progress" and we have data
                showNodeLog = false;
                var translationString = '';                    

                // add the data received to the object lastSyncData
                lastSyncData = _.extend(lastSyncData, data || {});
                
                // Select the appropriate message
                if(web3.net.peerCount > 0) {
                    // Check which state we are

                    if  (   0 < lastSyncData._displayKnownStates && (
                            lastSyncData.pulledStates !== Math.round(lastSyncData._displayState) 
                        ||  lastSyncData.knownStates !== Math.round(lastSyncData._displayKnownStates)) 
                    ) {
                        // Mostly downloading new states
                        translationString = 'mist.startScreen.nodeSyncInfoStates';

                    } else {
                        // Mostly downloading blocks
                        translationString = 'mist.startScreen.nodeSyncInfo';

                    }
                } else {
                    // Not online
                    translationString = 'mist.startScreen.nodeSyncConnecting';                    
                } 

                // Saves data as numbers (hex)
                lastSyncData._highestBlock = lastSyncData.highestBlock;

                // saves data as pretty strings
                lastSyncData.highestBlock = numeral(lastSyncData.highestBlock).format('0,0');

                // saves to template
                TemplateVar.set(template, 'lastSyncData', lastSyncData);

            } else {
                // It's not connected anymore
                if (web3.net.peerCount > 1) {
                    translationString = 'mist.startScreen.nodeSyncFoundPeers';                    
                } else {
                    translationString = 'mist.startScreen.nodeSyncConnecting';                    
                }

                TemplateVar.set(template, 'lastSyncData', {'peers': web3.net.peerCount});

            }

            TemplateVar.set(template, 'logText', false);
            TemplateVar.set(template, 'text', TAPi18n.__('mist.startScreen.nodeSyncing'));
            TemplateVar.set(template, 'syncStatusMessage', translationString);
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
        return 'file://'+ window.dirname +'/icons/'+ window.mist.mode +'/icon2x.png';
    },
    /**
    Updates the Sync Message live

    @method syncStatus
    */
    'syncStatus' : function() {

        // This functions loops trhough numbers while waiting for the node to respond
        var template = Template.instance();
        Meteor.clearInterval(template._intervalId);

        // Create an interval to quickly iterate trough the numbers
        template._intervalId = Meteor.setInterval(function(){
            // loads data from templates
            var syncData = TemplateVar.get(template, 'lastSyncData', lastSyncData);
            var translationString = TemplateVar.get(template, "syncStatusMessage");

            if (!(syncData._displayBlock > -1)) {
                // initialize the display numbers
                syncData._displayBlock = Number(syncData.currentBlock);
                syncData._displayState = Number(syncData.pulledStates || 0);
                syncData._displayKnownStates = Number(syncData.knownStates || 0);                    
            } else {
                // Increment each them slowly to match target number
                syncData._displayBlock += (Number(syncData.currentBlock) - syncData._displayBlock) / 10;
                syncData._displayState += (Number(syncData.pulledStates || 0) - syncData._displayState) / 10;
                syncData._displayKnownStates += (Number(syncData.knownStates || 0) - syncData._displayKnownStates) / 10;
            }

            // Create the fancy strings
            lastSyncData.displayBlock = numeral(Math.round(lastSyncData._displayBlock)).format('0,0');
            lastSyncData.displayState = numeral(Math.round(lastSyncData._displayState)).format('0,0');
            lastSyncData.displayKnownStates = numeral(Math.round(lastSyncData._displayKnownStates)).format('0,0');

            // Translate it
            var translatedMessage = TAPi18n.__(translationString, syncData);

            // Calculates both progress bars
            var stateProgress = null;
            if (0 < lastSyncData._displayKnownStates) {
                stateProgress = (lastSyncData._displayState / lastSyncData._displayKnownStates) * 100;
            }

            var progress = ((lastSyncData._displayBlock - Number(lastSyncData.startingBlock)) / (Number(lastSyncData._highestBlock) - Number(lastSyncData.startingBlock))) * 100 ;
                    
            // Saves data back to templates
            TemplateVar.set(template, "syncStatusMessageLive", translatedMessage);
            TemplateVar.set(template, 'lastSyncData', syncData);
            
            // set progress value
            if(_.isFinite(progress)) {
                TemplateVar.set(template, 'showProgressBar', true);
                TemplateVar.set(template, 'progress', progress);
                if (null !== stateProgress) {
                    TemplateVar.set(template, 'showStateProgressBar', true);
                    TemplateVar.set(template, 'stateProgress', stateProgress);
                }
            }

        }, 100);

        return TemplateVar.get(template, "syncStatusMessageLive");
    }
});


Template['popupWindows_splashScreen'].events({
   'click .start-app': function(){
        ipc.send('backendAction_skipSync');
   } 
});
