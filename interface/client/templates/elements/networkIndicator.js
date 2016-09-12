/**
Template Controllers

@module Templates
*/

/**
The networkIndicator template

@class [template] elements_networkIndicator
@constructor
*/



/**
Check network type.

@method checkNetworkType
*/
var checkNetworkType = function(template) {
    console.trace('Check network type...');

    NetworkInfo.promise.then(function() {
        try {
            console.log('network is ' + NetworkInfo.type);

            TemplateVar.set(template, 'network', NetworkInfo.type + 'net');
        } catch (err) {
            console.error('Error setting network var', err);
        }
    });
};



Template['elements_networkIndicator'].onRendered(function(){
    var template = this;

    TemplateVar.set(template, 'network', 'unknown');

    checkNetworkType(template);

    ipc.on('uiAction_nodeStatus', function(e, status) {
        console.trace('Node status', status);

        switch (status) {
            case 'starting':
            case 'stopping':
            case 'connected':
                console.debug('Node status changing, reset network type indicator');

                TemplateVar.set(template, 'network', 'unknown');
           
            break;
        }
    });

    ipc.on('uiAction_nodeSyncStatus', function(e, status, data) {
        console.trace('Node sync status', status);

        if ('inProgress' === status && TemplateVar.get(template, 'network')=='unknown') {
            console.debug('Node syncing, re-check network type.');

            checkNetworkType(template);            
        }
    });
});


