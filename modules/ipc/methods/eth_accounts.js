const _ = global._;
const GenericProcessor = require('./generic');


/**
 * Process method: eth_accounts
 */
module.exports = class extends GenericProcessor {
    /**
     * @override
     */
    exec (conn, payload) {
        return super.exec(conn, payload)
        .then((result) => {
            this._log.trace('Got account list', result);

            let tab = Tabs.findOne({ webviewId: conn.wnd.id });

            if(_.get(tab, 'permissions.accounts')) {
                result = _.intersection(result, tab.permissions.accounts);
            } else {
                result = [];
            }

            return result;
        });
    }
}


