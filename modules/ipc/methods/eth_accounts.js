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
    exec (eventSenderId, conn, payload) {
        return super.exec(eventSenderId, conn, payload)
        .then((result) => {
            this._log.trace('Got account list', result);

            let tab = Tabs.findOne({ webviewId: eventSenderId });

            if(_.get(tab, 'permissions.accounts')) {
                result = _.intersection(result, tab.permissions.accounts);
            } else {
                result = [];
            }

            return result;
        });
    }
}


