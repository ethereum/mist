const _ = global._;
const BaseProcessor = require('./base');
const eth = require('ethereumjs-util');

/**
 * Process method: eth_getTransactionReceipt
 * Due to a geth's light client v1 bug, it does not return
 * contractAddress value on the receipts. Let's fix that.
 */

module.exports = class extends BaseProcessor {

    sanitizeRequestPayload(conn, payload, isPartOfABatch) {
        return super.sanitizeRequestPayload(conn, payload, isPartOfABatch);
    }

    async exec(conn, payload) {
        const txHash = payload.params[0];

        // Sends regular eth_getTransactionReceipt request
        const ret = await conn.socket.send(payload, {
            fullResult: true
        });

        try {
            // If that contains a contractAddress already, fine.
            if (ret.result.result && ret.result.result.contractAddress != null) {
                return ret.result;
            }

            // 1. GET TRANSACTION from AND nonce VALUES
            const transactionInfo = await conn.socket.send({
                jsonrpc: '2.0',
                id: _.uuid(),
                method: 'eth_getTransactionByHash',
                params: [txHash]
            }, { fullResult: true });

            const fromAddress = transactionInfo.result.result.from;
            const nonce = parseInt(transactionInfo.result.result.nonce, 16);
            const possibleContractAddress = `0x${eth.generateAddress(fromAddress, nonce).toString('hex')}`;


            // 2. GET CODE FROM ADDRESS
            const contractCode = await conn.socket.send({
                jsonrpc: '2.0',
                id: _.uuid(),
                method: 'eth_getCode',
                params: [possibleContractAddress, 'latest']
            }, { fullResult: true });

            const contractCodeResult = contractCode.result.result;

            // 3. IF IT EXISTS, ASSIGN TO RETURN VALUE
            if (contractCodeResult && contractCodeResult.length > 2) {
                ret.result.result.contractAddress = possibleContractAddress;
            }
        } catch (e) {
            console.warn('[WARN]', txHash, e);
            return ret.result;
        }
        return ret.result;
    }
};
