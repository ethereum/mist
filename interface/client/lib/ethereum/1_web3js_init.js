// set providor
if(typeof web3 !== 'undefined') {
  console.info('Web3 already initialized, re-using provider.');

  web3 = new Web3(web3.currentProvider);
} else {
  console.info('Web3 not yet initialized, doing so now with HttpProvider.');

  web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
}


// fetch genesis block
console.info('Fetching network info...');

OnceNetworkInfoLoaded = new Promise(function(resolve, reject) {
  web3.eth.getBlock(0, function(e, res) {
    if (e) {
      console.error('Error fetching Genesis block');

      return reject(e);
    } else {
      console.info('Genesis block: ' + res.hash);

      var network = 'private';

      switch(res.hash) {
          case '0x0cd786a2425d16f152c658316c423e6ce1181e15c3295826d7c9904cba9ce303':
              network = 'test';
              break;
          case '0xd4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3':
              network = 'main';
              break;
      }

      return resolve({
        type: network,
        uniqueId: res.hash,
        genesis: res,      
      });
    }
  });
});

