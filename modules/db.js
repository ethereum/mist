const Loki = require('loki');
const Settings = require('./settings');
const path = require('path');
const Q = require('bluebird');
const log = require('./utils/logger').create('Db');



exports.init = function() {
  return new Q((resolve, reject) => {
    let db = new Loki(path.join(Settings.userDataPath, 'mist_settings.db'), {
      env: 'NODEJS',
      autosave: true,
      autosaveInterval: 5000,
      autoload: true,
      autoloadCallback: function(err) {
        if (err) {
          log.error(err);

          reject(new Error('Error instantiating local filesystem db'));
        }

        if (!db.getCollection('tabs')) {
          db.addCollection('tabs');
        }

        exports.Tabs = db.getCollection('tabs');

        resolve();
      }
    });
  });
};

