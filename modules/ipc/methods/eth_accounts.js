const BaseProcessor = require('./base');
const db = require('../../db');

/**
 * Process method: eth_accounts
 */
module.exports = class extends BaseProcessor {
  /**
   * @override
   */
  sanitizeResponsePayload(conn, payload, isPartOfABatch) {
    this._log.trace('Sanitize eth_acconts', payload.result);

    // if not an admin connection then return only permissioned accounts
    if (!this._isAdminConnection(conn)) {
      const tab = db.getCollection('UI_tabs').findOne({ webviewId: conn.id });
      if (tab && tab.permissions && tab.permissions.accounts) {
        payload.result = tab.permissions.accounts;
      } else {
        payload.result = [];
      }
    }

    return super.sanitizeResponsePayload(conn, payload, isPartOfABatch);
  }
};
