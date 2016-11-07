module.exports = {
    extend: (web3) => {
        function insertMethod(name, call, params, inputFormatter, outputFormatter) {
            return new web3._extend.Method({ name, call, params, inputFormatter, outputFormatter });
        }

        function insertProperty(name, getter, outputFormatter) {
            return new web3._extend.Property({ name, getter, outputFormatter });
        }

        // ADMIN
        web3._extend({
            property: 'admin',
            methods:
            [
                insertMethod('addPeer', 'admin_addPeer', 1, [web3._extend.utils.fromDecimal], web3._extend.formatters.formatOutputBool),
                insertMethod('exportChain', 'admin_exportChain', 1, [null], null),
                insertMethod('importChain', 'admin_importChain', 1, [null], null),
                insertMethod('verbosity', 'admin_verbosity', 1, [web3._extend.utils.formatInputInt], web3._extend.formatters.formatOutputBool),
                insertMethod('setSolc', 'admin_setSolc', 1, [null], web3._extend.formatters.formatOutputString),
                insertMethod('startRPC', 'admin_startRPC', 4, [null, web3._extend.utils.formatInputInteger, null, null], web3._extend.formatters.formatOutputBool),
                insertMethod('stopRPC', 'admin_stopRPC', 0, [], web3._extend.formatters.formatOutputBool),
            ],
            properties:
            [
                insertProperty('nodeInfo', 'admin_nodeInfo', web3._extend.formatters.formatOutputString),
                insertProperty('peers', 'admin_peers', null),
                insertProperty('datadir', 'admin_datadir', web3._extend.formatters.formatOutputString),
                insertProperty('chainSyncStatus', 'admin_chainSyncStatus', null),
            ],
        });

        // DEBUG
        web3._extend({
            property: 'debug',
            methods:
            [
                insertMethod('printBlock', 'debug_printBlock', 1, [web3._extend.formatters.formatInputInt], web3._extend.formatters.formatOutputString),
                insertMethod('getBlockRlp', 'debug_getBlockRlp', 1, [web3._extend.formatters.formatInputInt], web3._extend.formatters.formatOutputString),
                insertMethod('setHead', 'debug_setHead', 1, [web3._extend.formatters.formatInputInt], web3._extend.formatters.formatOutputBool),
                insertMethod('processBlock', 'debug_processBlock', 1, [web3._extend.formatters.formatInputInt], null),
                insertMethod('seedHash', 'debug_seedHash', 1, [web3._extend.formatters.formatInputInt], web3._extend.formatters.formatOutputString),
                insertMethod('dumpBlock', 'debug_dumpBlock', 1, [web3._extend.formatters.formatInputInt], null),
            ],
            properties: [],
        });

        // MINER
        web3._extend({
            property: 'miner',
            methods:
            [
                insertMethod('start', 'miner_start', 1, [web3._extend.formatters.formatInputInt], web3._extend.formatters.formatOutputBool),
                insertMethod('stop', 'miner_stop', 1, [web3._extend.formatters.formatInputInt], web3._extend.formatters.formatOutputBool),
                insertMethod('setExtra', 'miner_setExtra', 1, [web3._extend.utils.formatInputString], web3._extend.formatters.formatOutputBool),
                insertMethod('setGasPrice', 'miner_setGasPrice', 1, [web3._extend.utils.formatInputString], web3._extend.formatters.formatOutputBool),
                insertMethod('startAutoDAG', 'miner_startAutoDAG', 0, [], web3._extend.formatters.formatOutputBool),
                insertMethod('stopAutoDAG', 'miner_stopAutoDAG', 0, [], web3._extend.formatters.formatOutputBool),
                insertMethod('makeDAG', 'miner_makeDAG', 1, [web3._extend.formatters.inputDefaultBlockNumberFormatter], web3._extend.formatters.formatOutputBool),
            ],
            properties:
            [
                insertProperty('hashrate', 'miner_hashrate', web3._extend.utils.toDecimal),
            ],
        });

        // NETWORK
        web3._extend({
            property: 'network',
            methods:
            [
                insertMethod('addPeer', 'net_addPeer', 1, [web3._extend.utils.formatInputString], web3._extend.formatters.formatOutputBool),
                insertMethod('getPeerCount', 'net_peerCount', 0, [], web3._extend.formatters.formatOutputString),
            ],
            properties:
            [
                insertProperty('listening', 'net_listening', web3._extend.formatters.formatOutputBool),
                insertProperty('peerCount', 'net_peerCount', web3._extend.utils.toDecimal),
                insertProperty('peers', 'net_peers', null),
                insertProperty('version', 'net_version', web3._extend.formatters.formatOutputString),
            ],
        });

        // TX POOL
        web3._extend({
            property: 'txpool',
            methods: [],
            properties:
            [
                insertProperty('status', 'txpool_status', null),
            ],
        });
    },
};
