require('co-mocha');
const _ = require('underscore');
const genomatic = require('genomatic');
const Q = require('bluebird');
const fs = require('fs');
const Web3 = require('web3');
const shell = require('shelljs');
const path = require('path');
const packageJson = require('../package.json');
const gethPrivate = require('geth-private');
const Application = require('spectron').Application;
const chai = require('chai');
const http = require('http');
const ecstatic = require('ecstatic');
const ClientBinaryManager = require('ethereum-client-binaries').Manager;
const Settings = require('../modules/settings');

chai.should();

process.env.TEST_MODE = 'true';

const startGeth = function* () {
    let gethPath;

    const config = JSON.parse(
        fs.readFileSync(path.join('clientBinaries.json')).toString()
    );
    const manager = new ClientBinaryManager(config);
    yield manager.init();

    if (manager.clients.Geth.state.available) {
        gethPath = manager.clients.Geth.activeCli.fullPath;
    }
    else {
        console.info('Downloading geth...');
        let downloadedGeth = yield manager.download('Geth');
        gethPath = downloadedGeth.client.activeCli.fullPath;
        console.info('Geth downloaded at:', gethPath);
    }

    const geth = gethPrivate({
        gethPath,
        balance: 5,
        genesisBlock: {
            config: {
                chainId: 33333,
            },
            difficulty: '0x01',
            extraData: '0x01',
        },
        gethOptions: {
            port: 58546,
            rpcport: 58545,
        },
    });
    yield geth.start();
    return geth;
};

exports.mocha = (_module, options) => {
    const tests = {};

    options = _.extend({
        app: 'mist',
    }, options);

    _module.exports[options.name || path.basename(_module.filename)] = {
        * before() {
            this.timeout(1e7);

            this.assert = chai.assert;
            this.expect = chai.expect;

            const logFilePath = path.join(__dirname, 'mist.log');
            shell.rm('-rf', logFilePath);

            this.geth = yield startGeth();

            const appFileName = (options.app === 'wallet') ? 'Ethereum Wallet' : 'Mist';
            const appVers = packageJson.version.replace(/\./ig, '-');
            const platformArch = `${process.platform}-${process.arch}`;

            let appPath;
            let ipcProviderPath = path.join(this.geth.dataDir, 'geth.ipc');

            switch (platformArch) {
            case 'darwin-x64':
                appPath = path.join(process.cwd(), `dist_${options.app}`, 'dist', 'mac',
                    `${appFileName}.app`, 'Contents', 'MacOS', appFileName
                );
                break;
            case 'linux-x64':
                appPath = path.join(process.cwd(), `dist_${options.app}`, 'dist', 'linux-unpacked', appFileName.toLowerCase());
                break;
            default:
                throw new Error(`Cannot run tests on ${platformArch}, please run on: darwin-x64, linux-x64`);
            }

            // check that appPath exists
            if (!shell.test('-f', appPath)) {
                throw new Error(`Cannot find binary: ${appPath}`);
            }

            this.web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:58545'));
            this.app = new Application({
                requireName: 'electronRequire',
                startTimeout: 10000,
                waitTimeout: 10000,
                quitTimeout: 10000,
                path: appPath,
                args: [
                    '--mode', options.app,
                    '--loglevel', 'debug',
                    '--logfile', logFilePath,
                    '--node-datadir', this.geth.dataDir,
                    '--rpc', ipcProviderPath,
                ],
            });
            yield this.app.start();

            /*
                Starting HTTP server for HTML fixtures
            */
            const serverPort = 8080;
            this.httpServer = http.createServer(
                ecstatic({root: path.join(__dirname, 'fixtures')})
            ).listen(serverPort);
            this.fixtureBaseUrl = `http://localhost:${serverPort}/`;


            this.client = this.app.client;
            yield this.client.waitUntilWindowLoaded();
            // console.log(this.app.chromeDriver.logLines);

            /*
                Utility methods
            */
            for (const key in Utils) {
                this[key] = genomatic.bind(Utils[key], this);
            }

            // Loop over windows trying to select Main Window
            let app = this;
            let selectMainWindow = function* (mainWindowSearch) {
                let windowHandles = (yield app.client.windowHandles()).value;

                for (let handle in windowHandles) {
                    yield app.client.window(windowHandles[handle]);
                    const windowUrl = yield app.client.getUrl();
                    const isMainWindow = mainWindowSearch.test(windowUrl);
                    if (isMainWindow) return true;
                }

                // not main window. try again after 1 second.
                yield Q.delay(1000);
                yield selectMainWindow(mainWindowSearch);
            }

            const mainWindowSearch = (options.app === 'wallet') ? /^file:\/\/\/$/ : /interface\/index\.html$/;
            yield selectMainWindow(mainWindowSearch);

            this.mainWindowHandle = (yield this.client.windowHandle()).value;
        },

        * beforeEach () {
            yield this.app.client.window(this.mainWindowHandle);

            yield this.client.execute(() => { // Code executed in context of browser
                Tabs.remove({});
                LastVisitedPages.remove({});
                History.remove({});

                Tabs.insert({
                    _id: 'browser',
                    url: 'http://localhost:8080/',
                    redirect: 'http://localhost:8080/',
                    position: 0
                });
                Tabs.upsert({_id: 'wallet'}, {$set: {
                    url: 'https://wallet.ethereum.org',
                    redirect: 'https://wallet.ethereum.org',
                    position: 1,
                    permissions: { admin: true }
                }});

                LocalStore.set('selectedTab', 'browser');
            });
            yield Q.delay(2000);
            // yield this.client.reload();
        },

        * afterEach () {
        },

        * after () {
            console.log('After tests triggered');
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

        tests,
    };

    return tests;
};


const Utils = {
    * waitUntil(msg, promiseFn) {
        yield this.client.waitUntil(promiseFn, 10000, msg, 500);
    },
    * waitForText(selector, text, ms = 5000, message = 'Element couldn\'t be found') {
        const client = this.client;
        yield client.waitUntil(() => {
            return client.getText(selector).then((e) => {
                return e === text;
            });
        }, ms, message);
    },
    * getUiElements(selector) {
        const elems = yield this.client.elements(selector);

        return elems.value;
    },
    * getUiElement(selector) {
        const elem = yield this.client.element(selector);

        return elem.value;
    },
    * openAndFocusNewWindow(fnPromise) {
        const client = this.client;

        const existingHandles = (yield client.windowHandles()).value;

        yield fnPromise();

        yield this.waitUntil('new window visible', function checkForAddWindow() {
            return client.windowHandles().then((handles) => {
                return handles.value.length === existingHandles.length + 1;
            });
        });

        const newHandles = (yield client.windowHandles()).value;

        // focus on new window
        yield client.window(newHandles.pop());
    },
    * execElemsMethod(clientElementIdMethod, selector) {
        const elems = yield this.client.elements(selector);

        const values = yield elems.value.map(
      e => this.client[clientElementIdMethod](e.ELEMENT)
    );

        return values.map(r => r.value);
    },
    * execElemMethod(clientElementIdMethod, selector) {
        const e = yield this.client.element(selector);

        console.log(e);

        const value = yield this.client[clientElementIdMethod](e.ELEMENT);

        return value.value;
    },
    * capturePage() {
        const pageImage = yield this.app.browserWindow.capturePage();

        if (!pageImage) {
            throw new Error('Page capture failed');
        }

        fs.writeFileSync(path.join(__dirname, 'mist.png'), pageImage);
    },
    * getRealAccountBalances() {
        let accounts = this.web3.eth.accounts;

        let balances = accounts.map(acc =>
      `${this.web3.fromWei(this.web3.eth.getBalance(acc), 'ether')}`
    );

        accounts = accounts.map(a => a.toLowerCase());
        balances = balances.map(b => parseInt(b, 10));

        return _.object(accounts, balances);
    },
    * getUiAccountBalances() {
        // check balances on the pgetUiAccountsBalancesage
        let _accounts = yield this.execElemsMethod('elementIdText', '.wallet-box .account-id');
        let _balances = yield this.execElemsMethod('elementIdText', '.wallet-box .account-balance');

        _accounts = _accounts.map(a => a.toLowerCase());
        _balances = _balances.map(b => parseInt(b, 10));

        return _.object(_accounts, _balances);
    },
    * openAccountInUi(accId) {
        const _accounts = yield this.execElemsMethod('elementIdText', '.wallet-box .account-id');

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
    * startMining() {
        yield this.geth.consoleExec('miner.start();');
    },
    * stopMining() {
        yield this.geth.consoleExec('miner.stop();');
    },

    * selectTab(tabId) {
        const tab = yield this.getUiElement(`.sidebar [data-tab-id=${tabId}]`);
        yield this.client.click(`.sidebar [data-tab-id=${tabId}] button.main`);
        // TODO: returns webview reference
    },
    * getActiveWebview() {
        const webview = '';
        return webview;
    },
    * loadFixture(uri = '') {
        const client = this.client;
        yield client.setValue('#url-input', `${this.fixtureBaseUrl}${uri}`);
        yield client.submitForm('form.url');
        yield client.waitUntil(() => {
            return client.getText('.dapp-info span', (e) => {
                /Fixture/.test(e);
            });
        }, 3000, 'expected to properly load fixture');
    },
    * getBrowserBarText() {
        return yield this.client.getText('.url-breadcrumb');
    },
    *pinCurrentTab() {
        const client = this.client;

        yield this.openAndFocusNewWindow(() => {
            return client.click('span.connect-button');
        });
        yield client.click('.dapp-primary-button');

        yield client.window(this.mainWindowHandle); // selects main window again
        yield Q.delay(500);

        const pinnedWebview = (yield client.windowHandles()).value.pop();
        return pinnedWebview;
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
        if (tries < 0) throw new Error('Couldn\'t select window using given parameters.');

        let windowHandles = (yield this.client.windowHandles()).value;

        for (let handle in windowHandles) {
            yield this.client.window(windowHandles[handle]);

            const found = !!search(yield this.client.getUrl());
            if (found) return true;
        }
        yield Q.delay(500);
        yield this.getWindowByUrl(search, --tries);
    }

};
