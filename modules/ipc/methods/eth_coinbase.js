"use strict";

const _ = global._;
const BaseProcessor = require('./base');
const db = require('../../db');

/**
 * Process method: eth_coinbase
 */
module.exports = class extends BaseProcessor {
    /**
     * @override
     */
    sanitizeResponsePayload (conn, payload, isPartOfABatch) {
        this._log.trace('Sanitize account eth_coinbase', payload.result);

        // if not an admin connection then do a check
        if (!this._isAdminConnection(conn)) {
            let tab = db.getCollection('tabs').findOne({ webviewId: conn.id });

            if(_.get(tab, 'permissions.accounts')) {
                payload.result = _.contains(tab.permissions.accounts, payload.result) ? payload.result : null;
            } else {
                payload.result = null;
            }                
        }                
        
        return super.sanitizeResponsePayload(conn, payload, isPartOfABatch);
    }
}


