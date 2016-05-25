"use strict";

const _ = global._;
const got = require('got');
const semver = require('semver');
const Windows = require('./windows');
const log = require('./utils/logger').create('updateChecker');



/**
 * Check for updates to the app.
 * @return {[type]} [description]
 */
const check = exports.check = function() {
    log.info('Check for update...');

    let str = null;

    switch (global.mode) {
        // right now we are just releasing the wallet!
        case 'mist':
        case 'wallet':
            str = 'wallet';
            break;
    }

    return got('https://api.github.com/repos/ethereum/mist/releases', {
        timeout: 3000,
        json: true,
    })
    .then((res) => {
        let releases = _.filter(res.body, function(release) {
            return (
                !_.get(release, 'draft') 
                && 0 <= _.get(release, 'name', '').toLowerCase().indexOf(str)
            );
        });

        if (!releases.length) {
            log.debug('No releases available to check against.');

            return;
        }

        let latest = releases[0];

        if (semver.gt(latest.tag_name, global.version)) {
            log.info(`App (v${global.version}) is out of date. New v${latest.tag_name} found.`);

            return {
                name: latest.name,
                version: latest.tag_name,
                url: latest.html_url,
            };
        } else {
            log.info('App is up-to-date.');
        }
    })
    .catch((err) => {
        log.error('Error checking for update', err);
    });
};



exports.run = function() {
    check().then((update) => {
        if (update) {
            Windows.createPopup('updateAvailable', {
                electronOptions: {
                    width: 420, 
                    height: 230 ,
                    alwaysOnTop: true,
                },
                useWeb3: false,
                sendData: ['uiAction_appUpdateInfo', update],
            });
        }
    });
};





