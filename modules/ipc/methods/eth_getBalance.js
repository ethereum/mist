

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
        // TODO: have infura handle this only if geth isn't synced
        const ret = await ethereumNodeRemote.web3.eth.getBalance(...payload.params);

        return {
            jsonrpc: '2.0', 
            id: payload.id, 
            result: ret.toString(16)
        };
    }
};
