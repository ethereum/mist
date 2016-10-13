"use strict";

const _ = global._;
const BaseProcessor = require('./base');
const db = require('../../db');

/**
 * Process method: eth_accounts
 */
module.exports = class extends BaseProcessor {
    /**
     * @override
     */
    sanitizeResponsePayload (conn, payload, isPartOfABatch) {
        this._log.trace('Sanitize account list', payload.result);

        // if not an admin connection then do a check
        if (!this._isAdminConnection(conn)) {
            let tab = db.getCollection('tabs').findOne({ webviewId: conn.id });

            if(_.get(tab, 'permissions.accounts')) {
                payload.result = _.intersection(payload.result, tab.permissions.accounts);
            } else {
                payload.result = [];
            }                
        }                
        
        return super.sanitizeResponsePayload(conn, payload, isPartOfABatch);
    }
}


