const _ = require('./underscore');
const log4js = require('log4js');


/**
 * Setup logging system.
 * @param  {Object} [options]
 * @param  {String} [options.loglevel] Minimum logging threshold (default: info).
 * @param  {String} [options.logfile] File to write logs to (default: no file logging).
 */
exports.setup = function (options) {
    options = _.extend({
        logfile: null,
        loglevel: null,
    }, options);

    // logging
    const log4jsOptions = {
        appenders: [
            {
                type: 'console',
            },
        ],
        levels: {
            '[all]': (options.loglevel || 'info').toUpperCase(),
        },
    };

    if (options.logfile) {
        log4jsOptions.appenders.push(
            {
                type: 'file',
                filename: options.logfile,
            }
        );
    }

    log4js.configure(log4jsOptions);
};


exports.create = function (category) {
    const logger = log4js.getLogger(category);

    // Allow for easy creation of sub-categories.
    logger.create = function (subCategory) {
        return exports.create(`${category}/${subCategory}`);
    };

    return logger;
};
