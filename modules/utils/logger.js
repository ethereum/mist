const _ = require('./underscore');
const path = require('path');

import log4js from 'log4js';

/**
 * Setup logging system.
 * @param  {Object} [options]
 * @param  {String} [options.logLevel] Minimum logging threshold (default: info).
 * @param  {String} [options.logFolder] Log folder to write logs to.
 */
exports.setup = function(options) {
  const logFolder = options.logFolder;
  const level = options.logLevel || 'info';

  const config = {
    appenders: {
      out: { type: 'console' },
      all: {
        type: 'file',
        filename: path.join(logFolder, 'all.log')
      },
      main: {
        type: 'file',
        filename: path.join(logFolder, 'category', 'main.log')
      },
      EthereumNode: {
        type: 'file',
        filename: path.join(logFolder, 'category', 'ethereum_node.log')
      },
      swarm: {
        type: 'file',
        filename: path.join(logFolder, 'category', 'swarm.log')
      }
    },
    categories: {
      default: { appenders: ['out', 'all', 'main'], level },
      EthereumNode: { appenders: ['out', 'all', 'EthereumNode'], level },
      swarm: { appenders: ['out', 'all', 'swarm'], level }
    }
  };

  log4js.configure(config);
};

exports.create = category => {
  const logger = log4js.getLogger(category);

  // Allow for easy creation of sub-categories.
  logger.create = subCategory => {
    return exports.create(`${category}/${subCategory}`);
  };

  return logger;
};
