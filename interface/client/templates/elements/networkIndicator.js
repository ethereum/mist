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

    try {
        web3.eth.getBlock(0, function(e, res) {
            console.trace('Get block 0', e, res);
            
            if (e) {
                console.error('Got error fetching block 0', e);
            } else {
                
                switch (res.hash) {
                    case '0xd4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3':
                        console.log('network is mainnet')
                        TemplateVar.set(template, 'network', 'mainnet' );
                        break;

                    case '0x0cd786a2425d16f152c658316c423e6ce1181e15c3295826d7c9904cba9ce303':
                        console.log('network is testnet')
                        TemplateVar.set(template, 'network', 'testnet' );
                        break;
                    default:
                        console.log('network is privatenet')
                        TemplateVar.set(template, 'network', 'privatenet' );
                }                
            }
        });        
    } catch (err) {
        console.error('Unable to get block 0', err);
    }
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

        if ('inProgress' === status && TemplateVar.get(template, 'network') === 'unknown') {
            console.debug('Node syncing, re-check network type.');

            checkNetworkType(template);            
        }
    });
});


