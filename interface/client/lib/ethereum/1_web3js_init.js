import Web3 from 'web3';

// set providor
if (typeof web3 !== 'undefined') {
    console.info('Web3 already initialized, re-using provider.');

    web3 = new Web3(web3.currentProvider);
} else {
    console.info('Web3 not yet initialized, doing so now with HttpProvider.');

    web3 = new Web3('wss://rinkeby.infura.io/ws');
    // https://mainnet.infura.io/76PyENot1npWxmi8u28i
}
