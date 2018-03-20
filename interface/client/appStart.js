const { getLanguage } = require('./actions.js');

/**
The init function of Mist

@method mistInit
*/
mistInit = function() {
  console.info('Initialise Mist Interface');

  EthBlocks.init();
  const ethBlocksInterval = setInterval(() => {
    if (_.isEmpty(EthBlocks.latest)) {
      EthBlocks.init();
    } else {
      clearInterval(ethBlocksInterval);
    }
  }, 500);

  Tabs.onceSynced.then(function() {
    if (location.search.indexOf('reset-tabs') >= 0) {
      console.info('Resetting UI tabs');

      Tabs.remove({});
    }

    if (!Tabs.findOne('browser')) {
      console.debug('Insert tabs');

      Tabs.insert({
        _id: 'browser',
        url: 'https://ethereum.org',
        redirect: 'https://ethereum.org',
        position: 0
      });
    } else {
      Tabs.upsert(
        { _id: 'browser' },
        {
          $set: { position: 0 }
        }
      );
    }

    // overwrite wallet on start again, but use $set to preserve account titles
    Tabs.upsert(
      { _id: 'wallet' },
      {
        $set: {
          url: 'https://wallet.ethereum.org',
          redirect: 'https://wallet.ethereum.org',
          position: 1,
          permissions: {
            admin: true
          }
        }
      }
    );

    // on first use of Mist, show the wallet to nudge the user to create an account
    if (
      !LocalStore.get('selectedTab') ||
      !Tabs.findOne(LocalStore.get('selectedTab'))
    ) {
      LocalStore.set('selectedTab', 'wallet');
    }
  });
};

Meteor.startup(function() {
  console.info('Meteor starting up...');

  if (!location.hash) {
    // Main window
    EthAccounts.init();
    mistInit();
  }

  store.dispatch(getLanguage());

  // change moment and numeral language, when language changes
  Tracker.autorun(function() {
    if (_.isString(TAPi18n.getLanguage())) {
      const lang = TAPi18n.getLanguage().substr(0, 2);
      moment.locale(lang);
      try {
        numeral.language(lang);
      } catch (err) {
        console.warn(
          `numeral.js couldn't set number formating: ${err.message}`
        );
      }
      EthTools.setLocale(lang);
    }
  });
});
