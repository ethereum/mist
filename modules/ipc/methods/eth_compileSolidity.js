"use strict";

const solc = require('solc');
const Q = require('bluebird');
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

            let output = solc.compile(payload.params[0], 1); // 1 activates the optimiser

            let finalResult = _.extend({}, payload);

            if (!output || output.errors) {
                finalResult.error = {
                    code: -32700, 
                    message: (output ? output.errors : 'Compile error')                        
                };
            } else {
                finalResult.result = output.contracts;
            }            

            return finalResult;
        });
    }
}


