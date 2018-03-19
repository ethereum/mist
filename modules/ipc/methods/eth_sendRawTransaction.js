import ethereumNodeRemote from '../../ethereumNodeRemote';
const BaseProcessor = require('./base');

/**
 * Process method: eth_sendRawTransaction
 */
module.exports = class extends BaseProcessor {
  /**
   * @override
   */
  async exec(conn, payload) {
    console.log('∆∆∆ sendRaw payload', payload);
    if (store.getState().nodes.active === 'remote') {
      const result = await new Promise((resolve, reject) => {
        ethereumNodeRemote.web3.eth
          .sendSignedTransaction(payload.params[0])
          .once('transactionHash', hash => {
            console.log('∆∆∆ hash', hash);
            resolve({
              jsonrpc: '2.0',
              id: payload.id,
              result: hash
            });
          })
          .on('error', error => {
            reject(error);
            console.error(`Error from sendSignedTransaction: ${error}`);
          });
      });
      return result;
    } else {
      const ret = await conn.socket.send(payload, { fullResult: true });
      return ret.result;
    }
  }
};
