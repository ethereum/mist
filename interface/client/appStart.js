

// STOP here if not MAIN WINDOW
if(location.hash)
    return;


// set browser as default tab
if(!LocalStore.get('selectedTab'))
    LocalStore.set('selectedTab', 'browser');

/**
The init function of Mist

@method mistInit
*/
mistInit = function(){

    Meteor.setTimeout(function() {
        if(!Tabs.findOne('browser')) {
            Tabs.insert({
                _id: 'browser',
                url: 'about:blank',
                position: 0
            });

            Tabs.insert({
                url: 'http://ethereum-dapp-wallet.meteor.com',
                position: 1,
                permissions: {
                    accounts: web3.eth.accounts
                }
            });
        }

        if(!Tabs.findOne("install")) {
            Tabs.insert({
                _id: "install",
                position: 9999,
                name: "Install"
            })
        }
    }, 1500);

    EthAccounts.init();
    EthBlocks.init();
};


Meteor.startup(function(){
    // check that it is nopt syncing before
    web3.eth.getSyncing(function(e, sync) {
        if(e || !sync)
            mistInit();
    });
});

