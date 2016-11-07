const _ = global._;
const Windows = require('./windows');
const Settings = require('./settings');
const log = require('./utils/logger').create('updateChecker');
const got = require('got');
const semver = require('semver');


/**
 * Check for updates to the app.
 * @return {[type]} [description]
 */
const check = exports.check = function () {
    log.info('Check for update...');

    let str = null;

    switch (Settings.uiMode) {
    case 'mist':
        str = 'mist';
        break;
    case 'wallet':
        str = 'wallet';
        break;
    }

    return got('https://api.github.com/repos/ethereum/mist/releases', {
        timeout: 3000,
        json: true,
    })
    .then((res) => {
        const releases = _.filter(res.body, (release) => {
            return (
                !_.get(release, 'draft')
                && _.get(release, 'name', '').toLowerCase().indexOf(str) >= 0
            );
        });

        if (!releases.length) {
            log.debug('No releases available to check against.');

            return;
        }

        const latest = releases[0];

        if (semver.gt(latest.tag_name, Settings.appVersion)) {
            log.info(`App (${Settings.appVersion}) is out of date. New ${latest.tag_name} found.`);

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


function showWindow(options) {
    log.debug('Show update checker window');

    return Windows.createPopup('updateAvailable', _.extend({
        useWeb3: false,
        electronOptions: {
            width: 420,
            height: 230,
            alwaysOnTop: true,
            resizable: false,
            maximizable: false,
        },
    }, options));
}


exports.run = function () {
    check().then((update) => {
        if (update) {
            showWindow({
                sendData: ['uiAction_checkUpdateDone', update],
            });
        }
    }).catch((err) => {
        log.error(err);
    });
};


exports.runVisibly = function () {
    const wnd = showWindow({
        sendData: ['uiAction_checkUpdateInProgress'],
    });

    wnd.on('ready', () => {
        check().then((update) => {
            wnd.send('uiAction_checkUpdateDone', update);
        }).catch((err) => {
            log.error(err);

            wnd.send('uiAction_checkUpdateDone');
        });
    });
};
