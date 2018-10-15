import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { getLanguage } from './actions.js';
import About from '../components/About';
import RequestAccount from '../components/RequestAccount';
import NodeInfo from '../components/NodeInfo/';
import SendTx from '../components/SendTx/';
import TxHistory from '../components/TxHistory/';

/**
The init function of Mist
@method initMist
*/
initMist = function() {
  console.info('Initialize Mist Interface');
  initTabs();
};

function initTabs() {
  console.debug('Init tabs');

  Tabs.onceSynced.then(function() {
    if (location.search.indexOf('reset-tabs') >= 0) {
      console.info('Resetting UI tabs');
      Tabs.remove({});
    }

    // Overwrite wallet on start again,
    // but use $set to preserve account titles
    Tabs.upsert(
      { _id: 'wallet' },
      {
        $set: {
          url: `file://${dirname}/wallet/index.html`,
          redirect: `file://${dirname}/wallet/index.html`,
          position: 0,
          permissions: {
            admin: true
          }
        }
      }
    );

    if (!Tabs.findOne('browser')) {
      const url = 'https://www.stateofthedapps.com';
      Tabs.insert({
        _id: 'browser',
        url,
        redirect: url,
        position: 1
      });
    } else {
      Tabs.upsert(
        { _id: 'browser' },
        {
          $set: { position: 1 }
        }
      );
    }

    // on first use of Mist, show the wallet to nudge the user to create an account
    if (
      !LocalStore.get('selectedTab') ||
      !Tabs.findOne(LocalStore.get('selectedTab'))
    ) {
      LocalStore.set('selectedTab', 'wallet');
    }
  });
}

function renderReactComponentPopup(locationHash) {
  // NOTE: when adding new React components, remember to skip meteor template in templates/index.js
  // Example hash: '#about'. Manipulate string to return 'About'.
  const componentName =
    locationHash.charAt(1).toUpperCase() + locationHash.slice(2);

  // JSX can't evaluate an expression or string, so map imported components here
  const components = {
    About,
    RequestAccount,
    SendTx,
    TxHistory
  };

  // Only render a component if it exists
  if (!!components[componentName]) {
    const Component = components[componentName];

    render(
      <Provider store={store}>
        <Component />
      </Provider>,
      document.getElementById('react-entry')
    );
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

function handleLanguage() {
  let currentLang = store.getState().settings.i18n;

  store.subscribe(() => {
    const newLang = store.getState().settings.i18n;
    if (currentLang !== newLang) {
      i18n.changeLanguage(newLang);
      currentLang = newLang;
    }
  });
}

function renderReact() {
  // handle main window:
  if (!location.hash) {
    handleLanguage();
    EthAccounts.init();
    initMist();
    renderReactComponentMain();
  } else {
    // handle popup windows:
    renderReactComponentPopup(location.hash);
  }
}

Meteor.startup(function() {
  console.info('Meteor starting up...');

  renderReact();

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
