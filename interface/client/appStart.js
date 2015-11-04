

// STOP here if not MAIN WINDOW
if(location.hash)
    return;


// set browser as default tab
if(!LocalStore.get('selectedTab'))
    LocalStore.set('selectedTab', 'browser');


Meteor.startup(function(){
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
    }, 1500);

    EthAccounts.init();
    EthBlocks.init();
});

