import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { getLanguage } from './actions.js';
import About from '../components/About';
import RequestAccount from '../components/RequestAccount';
import NodeInfo from '../components/NodeInfo';

/**
The init function of Mist

@method mistInit
*/
mistInit = function() {
  console.info('Initialise Mist Interface');

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
          url: `file://${dirname}/wallet.asar/index.html`,
          redirect: `file://${dirname}/wallet.asar/index.html`,
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

function renderReactComponentPopup(locationHash) {
  // NOTE: when adding new React components, remember to skip meteor template in templates/index.js
  // Example hash: '#about'. Manipulate string to return 'About'.
  const componentName =
    locationHash.charAt(1).toUpperCase() + locationHash.slice(2);
  console.log('∆∆∆ componentName', componentName);

  // JSX can't evaluate an expression or string, so map imported components here
  const components = {
    About,
    RequestAccount
  };

  // Only render a component if it exists
  if (!!components[componentName]) {
    const Component = components[componentName];

    render(<Component />, document.getElementById('react-entry'));
  }
}

function renderReactComponentMain() {
  render(
    <Provider store={store}>
      <NodeInfo />
    </Provider>,
    document.getElementById('react__node-info')
  );
}

Meteor.startup(function() {
  console.info('Meteor starting up...');

  // TODO: update language when redux updates
  // 18n.changeLanguage(lang);

  if (!location.hash) {
    // Main window
    EthAccounts.init();
    mistInit();
    renderReactComponentMain();
  } else {
    // render React popup window
    renderReactComponentPopup(location.hash);
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
