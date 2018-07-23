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
const check = (exports.check = () => {
  log.info('Check for update...');

  let str = null;

  switch (
    Settings.uiMode // eslint-disable-line default-case
  ) {
    case 'mist':
      str = 'mist';
      break;
    case 'wallet':
      str = 'wallet';
      break;
  }

  return got('https://api.github.com/repos/ethereum/mist/releases/latest', {
    timeout: 30000,
    json: true
  })
    .then(res => {
      const release = res.body;

      if (!release) {
        log.debug('No releases available to check against.');

        return;
      }

      if (semver.gt(release.tag_name, Settings.appVersion)) {
        log.info(
          `App (${Settings.appVersion}) is out of date. New ${
            release.tag_name
          } found.`
        );

        return {
          name: release.name,
          version: release.tag_name,
          url: release.html_url
        };
      }

      log.info('App is up-to-date.');
    })
    .catch(err => {
      log.error('Error checking for update', err);
    });
});

function showWindow(options) {
  log.debug('Show update checker window');

  return Windows.createPopup('updateAvailable', options);
}

exports.run = () => {
  check()
    .then(update => {
      if (update) {
        showWindow({
          sendData: {
            uiAction_checkUpdateDone: update
          }
        });
      }
      store.dispatch({ type: '[MAIN]:UPDATE_CHECKER:FINISHED' });
    })
    .catch(err => {
      log.error(err);
    });
};

exports.runVisibly = () => {
  const wnd = showWindow({
    sendData: 'uiAction_checkUpdateInProgress'
  });

  wnd.on('ready', () => {
    check()
      .then(update => {
        wnd.send({
          uiAction_checkUpdateDone: update
        });
      })
      .catch(err => {
        log.error(err);

        wnd.send('uiAction_checkUpdateDone');
      });
  });
};
