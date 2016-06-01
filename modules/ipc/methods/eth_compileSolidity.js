"use strict";

const solc = require('solc');

const BaseProcessor = require('./base');


/**
 * Process method: eth_compileSolidity
 */
module.exports = class extends BaseProcessor {
    /**
     * @override
     */
    exec (conn, payload) {
        return Q.try(() => {
            this._log.info('Compile solidity');

            var output = solc.compile(payload.params[0], 1); // 1 activates the optimiser

            if (!output || output.errors) {
                throw {
                    code: -32700, 
                    message: (output ? output.errors : 'Compile error')
                };
            } else {
                return output.contracts;
            }            
        });
    }
}


