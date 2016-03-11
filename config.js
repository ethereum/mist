
var config = {
    name: 'Mist'
};


// change for wallet
if(global.mode === 'wallet') {
    config.name = 'Ethereum Wallet'
}



module.exports = config;