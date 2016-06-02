"use strict";

const _ = global._;
const BaseProcessor = require('./base');


/**
 * Process method: eth_accounts
 */
module.exports = class extends BaseProcessor {
    /**
     * @override
     */
    exec (conn, payload) {
        return super.exec(conn, payload)
        .then((result) => {
            this._log.trace('Got account list', result);

            let tab = Tabs.findOne({ webviewId: conn.id });

            if(_.get(tab, 'permissions.accounts')) {
                result = _.intersection(result, tab.permissions.accounts);
            } else {
                result = [];
            }

            return result;
        });
    }
}


