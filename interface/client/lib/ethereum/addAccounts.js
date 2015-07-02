/**

@module Ethereum
*/


addAccounts = function(){
    // UPDATE normal accounts on start
    web3.eth.getAccounts(function(e, accounts){
        _.each(Accounts.find().fetch(), function(account){
            if(!_.contains(accounts, account.address)) {
                Accounts.remove(account._id);
            } else {
                web3.eth.getBalance(account.address, function(e, balance){
                    if(!e) {
                        Accounts.update(account._id, {$set: {
                            balance: balance.toString(10)
                        }});
                    }
                });
            }

            accounts = _.without(accounts, account.address);
        });
        // ADD missing accounts
        _.each(accounts, function(address){
            web3.eth.getBalance(address, function(e, balance){
                if(!e) {
                    web3.eth.getCoinbase(function(e, coinbase){
                        Accounts.insert({
                            address: address,
                            balance: balance.toString(10),
                            name: (address === coinbase) ? 'Coinbase' : address
                        });
                    });
                }
            });
        });
    });

    // UPDATE SIMPLE ACCOUNTS balance on each new block
    web3.eth.filter('latest').watch(function(e, res){
        if(!e) {
            _.each(Accounts.find().fetch(), function(account){
                web3.eth.getBalance(account.address, function(err, res){
                    Accounts.update(account._id, {$set: {
                        balance: res.toString(10)
                    }});
                });
            });
        }
    });
}