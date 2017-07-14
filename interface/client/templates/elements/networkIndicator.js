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
var checkNetworkType = function (template) {
    console.trace('Check network type...');

    try {
        web3.eth.getBlock(0, function (e, res) {
            console.trace('Get block 0', e, res);

            if (e) {
                console.error('Got error fetching block 0', e);
            } else {
                TemplateVar.set(template, 'network', Helpers.detectNetwork(res.hash).type);
                TemplateVar.set(template, 'networkName', Helpers.detectNetwork(res.hash).name);
            }
        });
    } catch (err) {
        console.error('Unable to get block 0', err);
    }
};


Template['elements_networkIndicator'].onRendered(function () {
    var template = this;

    TemplateVar.set(template, 'network', 'unknown');

    checkNetworkType(template);

    ipc.on('uiAction_nodeStatus', function (e, status) {
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

    ipc.on('uiAction_nodeSyncStatus', function (e, status, data) {
        console.trace('Node sync status', status);

        if ('inProgress' === status && TemplateVar.get(template, 'network') === 'unknown') {
            console.debug('Node syncing, re-check network type.');

            checkNetworkType(template);
        }
    });
});
