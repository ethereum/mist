const solc = require('solc');

const GenericProcessor = require('./generic');


/**
 * Process method: eth_compileSolidity
 */
module.exports = class extends GenericProcessor {
    /**
     * @override
     */
    exec (conn, payload) {
        this._log.info('Compile solidity');

        var output = solc.compile(payload.params[0], 1); // 1 activates the optimiser

        if (!output || output.errors) {
            throw {"jsonrpc": "2.0", "error": {code: -32700, message: (output ? output.errors : 'Compile error')}, "id": payload.id};
        } else {
            return {"jsonrpc": "2.0", "result": output.contracts, "id": payload.id};
        }
    }
}


