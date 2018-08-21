require('co-mocha');
const _ = require('underscore');
const genomatic = require('genomatic');
const Q = require('bluebird');
const fs = require('fs');
const Web3 = require('web3');
const shell = require('shelljs');
const path = require('path');
const gethPrivate = require('geth-private');
const Application = require('spectron').Application;
const chai = require('chai');
const http = require('http');
const ecstatic = require('ecstatic');
const express = require('express');
const ClientBinaryManager = require('ethereum-client-binaries').Manager;
const logger = require('../modules/utils/logger');

chai.should();

process.env.TEST_MODE = 'true';

const log = logger.create('base');

const startGeth = function*() {
  let gethPath;

  const config = JSON.parse(
    fs.readFileSync(path.join('clientBinaries.json')).toString()
  );
  const manager = new ClientBinaryManager(config);
  yield manager.init();

  if (!manager.clients.Geth.state.available) {
    gethPath = manager.clients.Geth.activeCli.fullPath;
    console.info('Downloading geth...');
    const downloadedGeth = yield manager.download('Geth');
    gethPath = downloadedGeth.client.activeCli.fullPath;
    console.info('Geth downloaded at:', gethPath);
  }

  const geth = gethPrivate({
    gethPath,
    balance: 5,
    genesisBlock: {
      config: {
        chainId: 33333
      },
      difficulty: '0x01',
      extraData: '0x01'
    },
    gethOptions: {
      port: 58546,
      rpcport: 58545
    }
  });

  console.info('Geth starting...');
  yield geth.start();
  console.info('Geth started');

  return geth;
};

const startFixtureServer = function(serverPort) {
  log.info('Starting fixture server...');
  const app = express();
  app.use(express.static(path.join(__dirname, 'fixtures')));

  app.get('/redirect', (req, res) => {
    // Redirects to param ?url=XX
    res.redirect(302, req.query.to);
  });
  app.listen(serverPort);
  log.info('Fixture server started');
  return app;
};

exports.mocha = (_module, options) => {
  const tests = {};

  options = _.extend(
    {
      app: 'mist'
    },
    options
  );

  _module.exports[options.name || path.basename(_module.filename)] = {
    *before() {
      this.timeout(1e7);

      this.assert = chai.assert;
      this.expect = chai.expect;

      const mistLogFile = path.join(__dirname, 'mist.log');
      const chromeLogFile = path.join(__dirname, 'chrome.log');
      const webdriverLogDir = path.join(__dirname, 'webdriver');

      _.each([mistLogFile, webdriverLogDir, chromeLogFile], e => {
        console.info('Removing log files', e);
        shell.rm('-rf', e);
      });

      this.geth = yield startGeth();

      const appFileName = options.app === 'wallet' ? 'Ethereum Wallet' : 'Mist';
      const platformArch = `${process.platform}-${process.arch}`;
      console.info(`${appFileName} :: ${platformArch}`);

      let appPath;
      const ipcProviderPath = path.join(this.geth.dataDir, 'geth.ipc');

      switch (platformArch) {
        case 'darwin-x64':
          appPath = path.join(
            process.cwd(),
            `dist_${options.app}`,
            'dist',
            'mac',
            `${appFileName}.app`,
            'Contents',
            'MacOS',
            appFileName
          );
          break;
        case 'linux-x64':
          appPath = path.join(
            process.cwd(),
            `dist_${options.app}`,
            'dist',
            'linux-unpacked',
            appFileName.toLowerCase()
          );
          break;
        default:
          throw new Error(
            `Cannot run tests on ${platformArch}, please run on: darwin-x64, linux-x64`
          );
      }
      console.info(`appPath: ${appPath}`);

      // check that appPath exists
      if (!shell.test('-f', appPath)) {
        throw new Error(`Cannot find binary: ${appPath}`);
      }

      this.web3 = new Web3(
        new Web3.providers.HttpProvider('http://localhost:58545')
      );
      this.app = new Application({
        requireName: 'electronRequire',
        startTimeout: 10000,
        waitTimeout: 10000,
        quitTimeout: 10000,
        path: appPath,
        args: [
          '--loglevel',
          'debug',
          '--logfile',
          mistLogFile,
          '--node-datadir',
          this.geth.dataDir,
          '--rpc',
          ipcProviderPath
        ],
        webdriverOptions: {
          deprecationWarnings: false
        },
        webdriverLogPath: webdriverLogDir,
        chromeDriverLogPath: chromeLogFile
      });

      console.info('Starting app...');
      yield this.app.start();
      console.info('App started');

      this.client = this.app.client;

      /*
                Starting HTTP server for HTML fixtures
            */
      const serverPort = 8080;
      this.httpServer = startFixtureServer(serverPort);
      this.fixtureBaseUrl = `http://localhost:${serverPort}/`;

      /*
                Utility methods
            */
      for (const key in Utils) {
        this[key] = genomatic.bind(Utils[key], this);
      }

      // Loop over windows trying to select Main Window
      const app = this;
      const selectMainWindow = function*(mainWindowSearch, retries = 20) {
        console.log(`selectMainWindow retries remaining: ${retries}`);
        let windowHandles = (yield app.client.windowHandles()).value;

        for (let handle in windowHandles) {
          yield app.client.window(windowHandles[handle]);
          const windowUrl = yield app.client.getUrl();
          const isMainWindow = mainWindowSearch.test(windowUrl);
          if (isMainWindow) return true;
        }

        if (retries === 0) throw new Error('Failed to select main window');

        // not main window. try again after 2 seconds.
        yield Q.delay(2000);
        yield selectMainWindow(mainWindowSearch, --retries);
      };

      const mainWindowSearch =
        options.app === 'wallet' ? /^file:\/\/\/$/ : /interface\/index\.html$/;
      yield selectMainWindow(mainWindowSearch);
      console.log('Main window selected');

      this.mainWindowHandle = (yield this.client.windowHandle()).value;

      // Waits for "Connecting..." phase to end and webviews become available
      const waitForVisibleWebview = function*(retries) {
        console.log(`waitForVisibleWebview retries remaining: ${retries}`);
        const webview = yield app.client.elements(
          'div.webview:not(.hidden) webview[data-id]'
        );
        if (webview.value.length > 0) return;
        if (retries === 0)
          throw new Error('Failed to get visible webview at startup');
        yield Q.delay(5000);
        yield waitForVisibleWebview(--retries);
      };
      yield waitForVisibleWebview(60);
    },

    *beforeEach() {
      yield this.app.client.window(this.mainWindowHandle);

      yield this.client.execute(() => {
        // Code executed in context of browser
        Tabs.remove({});
        LastVisitedPages.remove({});
        History.remove({});

        Tabs.insert({
          _id: 'browser',
          url: 'http://localhost:8080/',
          redirect: 'http://localhost:8080/',
          position: 0
        });
        Tabs.upsert(
          { _id: 'wallet' },
          {
            $set: {
              url: 'https://wallet.ethereum.org',
              redirect: 'https://wallet.ethereum.org',
              position: 1,
              permissions: { admin: true }
            }
          }
        );

        LocalStore.set('selectedTab', 'browser');
      });
      yield Q.delay(1000);
    },

    // * afterEach() { },

    *after() {
      if (this.app && this.app.isRunning()) {
        console.log('Stopping app...');
        yield this.app.stop();
      }

      if (this.geth && this.geth.isRunning) {
        console.log('Stopping geth...');
        yield this.geth.stop();
      }

      if (this.httpServer && this.httpServer.isListening) {
        console.log('Stopping http server...');
        yield this.httpServer.close();
      }
    },

    tests
  };

  return tests;
};

const Utils = {
  *waitUntil(msg, promiseFn) {
    yield this.client.waitUntil(promiseFn, 10000, msg, 500);
  },
  *waitForText(
    selector,
    text,
    ms = 5000,
    message = "Element couldn't be found"
  ) {
    const client = this.client;
    yield client.waitUntil(
      () => {
        return client.getText(selector).then(e => {
          return e === text;
        });
      },
      ms,
      message
    );
  },
  *getUiElements(selector) {
    const elems = yield this.client.elements(selector);

    return elems.value;
  },
  *getUiElement(selector) {
    const elem = yield this.client.element(selector);

    return elem.value;
  },
  *openAndFocusNewWindow(type, fnPromise) {
    yield fnPromise();
    const handle = yield this.selectWindowHandleByType(type);
    yield this.client.window(handle);
  },
  *selectWindowHandleByType(type) {
    const client = this.client;
    const windowHandles = (yield client.windowHandles()).value;

    for (let handle in windowHandles) {
      yield client.window(windowHandles[handle]);
      const windowUrl = yield client.getUrl();
      if (new RegExp(type).test(windowUrl)) {
        return windowHandles[handle];
      }
    }
  },
  *execElemsMethod(clientElementIdMethod, selector) {
    const elems = yield this.client.elements(selector);

    const values = yield elems.value.map(e =>
      this.client[clientElementIdMethod](e.ELEMENT)
    );

    return values.map(r => r.value);
  },
  *execElemMethod(clientElementIdMethod, selector) {
    const e = yield this.client.element(selector);

    console.log(e);

    const value = yield this.client[clientElementIdMethod](e.ELEMENT);

    return value.value;
  },
  *capturePage() {
    const pageImage = yield this.app.browserWindow.capturePage();

    if (!pageImage) {
      throw new Error('Page capture failed');
    }

    fs.writeFileSync(path.join(__dirname, 'mist.png'), pageImage);
  },
  *getRealAccountBalances() {
    let accounts = this.web3.eth.accounts;

    let balances = accounts.map(
      acc => `${this.web3.fromWei(this.web3.eth.getBalance(acc), 'ether')}`
    );

    accounts = accounts.map(a => a.toLowerCase());
    balances = balances.map(b => parseInt(b, 10));

    return _.object(accounts, balances);
  },
  *getUiAccountBalances() {
    // check balances on the pgetUiAccountsBalancesage
    let _accounts = yield this.execElemsMethod(
      'elementIdText',
      '.wallet-box .account-id'
    );
    let _balances = yield this.execElemsMethod(
      'elementIdText',
      '.wallet-box .account-balance'
    );

    _accounts = _accounts.map(a => a.toLowerCase());
    _balances = _balances.map(b => parseInt(b, 10));

    return _.object(_accounts, _balances);
  },
  *openAccountInUi(accId) {
    const _accounts = yield this.execElemsMethod(
      'elementIdText',
      '.wallet-box .account-id'
    );

    let idx = -1;

    const accountId = accId.toLowerCase();

    for (const i in _accounts) {
      if (_accounts[i].toLowerCase() === accountId) {
        idx = i;
      }
    }

    if (idx < 0) {
      throw new Error('Unable to find account in UI');
    }

    const accLinks = yield this.client.elements('.wallet-box');

    yield this.client.elementIdClick(accLinks.value[idx].ELEMENT);

    yield Q.delay(1000);
  },
  *startMining() {
    yield this.geth.consoleExec('miner.start();');
  },
  *stopMining() {
    yield this.geth.consoleExec('miner.stop();');
  },

  *selectTab(tabId) {
    yield this.getUiElement(`.sidebar [data-tab-id=${tabId}]`);
    yield this.client.click(`.sidebar [data-tab-id=${tabId}] button.main`);
    // TODO: returns webview reference
  },

  *getSelectedWebviewParam(param) {
    const selectedTabId = (yield this.client.execute(() => {
      return localStorage.getItem('selectedTab');
    })).value;
    return yield this.client.getAttribute(
      `webview[data-id=${selectedTabId}]`,
      param
    );
  },

  *loadFixture(uri = '') {
    const client = this.client;
    yield client.setValue('#url-input', `${this.fixtureBaseUrl}${uri}`);
    yield client.submitForm('form.url');
    yield client.waitUntil(
      () => {
        return client.getText('.dapp-info span', e => {
          /Fixture/.test(e);
        });
      },
      3000,
      'expected to properly load fixture'
    );
  },

  *getBrowserBarText() {
    return yield this.client.getText('.url-breadcrumb');
  },

  *pinCurrentTab() {
    const client = this.client;
    yield this.openAndFocusNewWindow('connectAccount', () => {
      return client.click('span.connect-button');
    });
    yield client.click('.dapp-primary-button');
    yield this.delay(500);
    yield client.window(this.mainWindowHandle); // selects main window again

    const pinnedWebview = (yield client.windowHandles()).value.pop();
    return pinnedWebview;
  },

  *delay(ms) {
    yield this.waitUntil('delay', async () => {
      return new Promise(resolve => setTimeout(() => resolve(true), ms));
    });
  },

  *navigateTo(url) {
    const client = this.client;
    yield client.setValue('#url-input', url);
    yield client.submitForm('form.url');
  },

  /*
    @method getWindowByUrl

    @param search: function that tells how to search by window
    @param tries: amount of tries left until give up searching for
    */
  *getWindowByUrl(search, tries = 5) {
    if (tries < 0)
      throw new Error("Couldn't select window using given parameters.");
    const windowHandles = (yield this.client.windowHandles()).value;
    for (let handle in windowHandles) {
      yield this.client.window(windowHandles[handle]);
      const found = !!search(yield this.client.getUrl());
      if (found) return true;
    }
    yield Q.delay(500);
    yield this.getWindowByUrl(search, --tries); //eslint-disable-line
  }
};
