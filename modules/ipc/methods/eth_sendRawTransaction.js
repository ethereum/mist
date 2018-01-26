

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
            const ret = await ethereumNodeRemote.web3.eth.sendSignedTransaction(payload.params[0]);
            console.log('∆∆∆ sendRaw ret', ret);

            return {
                jsonrpc: '2.0',
                id: payload.id,
                result: ret,
            };
        } else {
            const ret = await conn.socket.send(payload, { fullResult: true });
            return ret.result;
        }
    }
};
