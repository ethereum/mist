const _ = require('../../utils/underscore.js');
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
  exec(conn, payload) {
    return Q.try(() => {
      this._log.debug('Compile solidity');

      const output = solc.compile(payload.params[0], 1); // 1 activates the optimiser

      const finalResult = _.extend({}, payload);

      if (!output || output.errors) {
        let msg = output ? output.errors : 'Compile error';

        if (_.isArray(msg)) {
          msg = msg.join(', ');
        }

        finalResult.error = {
          code: -32700,
          message: msg
        };
      } else {
        finalResult.result = output.contracts;
      }

      return finalResult;
    });
  }

  /**
   * @override
   */
  sanitizeRequestPayload(conn, payload, isPartOfABatch) {
    if (isPartOfABatch) {
      throw this.ERRORS.BATCH_COMPILE_DENIED;
    }

    return super.sanitizeRequestPayload(conn, payload, isPartOfABatch);
  }
};
