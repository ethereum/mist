const fs = require('fs');
const path = require('path');
const Q = require('bluebird');
const Loki = require('lokijs');
const Settings = require('./settings');
const log = require('./utils/logger').create('Db');


let db;


exports.init = function () {
    const filePath = path.join(Settings.userDataPath, 'mist.lokidb');

    return Q.try(() => {
        // if db file doesn't exist then create it
        try {
            log.debug(`Check that db exists and it\'s writeable: ${filePath}`);
            fs.accessSync(filePath, fs.R_OK | fs.W_OK);
            return Q.resolve();
        } catch (err) {
            log.info(`Creating db: ${filePath}`);

            const tempdb = new Loki(filePath, {
                env: 'NODEJS',
                autoload: false,
            });

            return new Q.promisify(tempdb.saveDatabase, { context: tempdb })();
        }
    })
    .then(() => {
        log.info(`Loading db: ${filePath}`);

        return new Q((resolve, reject) => {
            db = new Loki(filePath, {
                env: 'NODEJS',
                autosave: true,
                autosaveInterval: 5000,
                autoload: true,
                autoloadCallback(err) {
                    if (err) {
                        log.error(err);
                        reject(new Error('Error instantiating db'));
                    }
                    resolve();
                },
            });
        });
    });
};


exports.getCollection = function (name) {
    if (!db.getCollection(name)) {
        db.addCollection(name);
    }

    return db.getCollection(name);
};


exports.close = function () {
    return new Q((resolve, reject) => {
        db.close((err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};
