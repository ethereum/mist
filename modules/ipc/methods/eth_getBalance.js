

import ethereumNodeRemote from '../../ethereumNodeRemote';
const BaseProcessor = require('./base');

/**
 * Process method: eth_getBalance
 */
module.exports = class extends BaseProcessor {
    /**
     * @override
     */
    async exec(conn, payload) {
        if (store.getState().nodes.active === 'remote') {
            const ret = await ethereumNodeRemote.web3.eth.getBalance(...payload.params);

            return {
                jsonrpc: '2.0',
                id: payload.id,
                result: ret.toString(16)
            };
        } else {
            const ret = await conn.socket.send(payload, { fullResult: true });
            return ret.return;
        }
    }
};
