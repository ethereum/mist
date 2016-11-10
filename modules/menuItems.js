const { app, BrowserWindow, ipcMain: ipc, Menu, shell } = require('electron');
const Windows = require('./windows');
const Settings = require('./settings');
const log = require('./utils/logger').create('menuItems');
const updateChecker = require('./updateChecker');
const ethereumNode = require('./ethereumNode.js');
const ClientBinaryManager = require('./clientBinaryManager');


// Make easier to return values for specific systems
const switchForSystem = function (options) {
    if (process.platform in options) {
        return options[process.platform];
    }
    else if ('default' in options) {
        return options.default;
    }
};


// create menu
// null -> null
const createMenu = function (webviews) {
    webviews = webviews || [];

    const menu = Menu.buildFromTemplate(menuTempl(webviews));
    Menu.setApplicationMenu(menu);
};


const restartNode = function (newType, newNetwork) {
    newNetwork = newNetwork || ethereumNode.network;

    log.info('Switch node', newType, newNetwork);

    return ethereumNode.restart(newType, newNetwork)
        .then(() => {
            Windows.getByType('main').load(global.interfaceAppUrl);

            createMenu(webviews);
        })
        .catch((err) => {
            log.error('Error switching node', err);
        });
};


// create a menu template
// null -> obj
let menuTempl = function (webviews) {
    const menu = [];
    webviews = webviews || [];

    // APP
    const fileMenu = [];

    if (process.platform === 'darwin') {
        fileMenu.push(
            {
                label: i18n.t('mist.applicationMenu.app.about', { app: Settings.appName }),
                click() {
                    Windows.createPopup('about', {
                        electronOptions: {
                            width: 420,
                            height: 230,
                            alwaysOnTop: true,
                        },
                    });
                },
            },
            {
                label: i18n.t('mist.applicationMenu.app.checkForUpdates'),
                click() {
                    updateChecker.runVisibly();
                },
            }, {
                type: 'separator',
            },
            {
                label: i18n.t('mist.applicationMenu.app.services', { app: Settings.appName }),
                role: 'services',
                submenu: [],
            },
            {
                type: 'separator',
            },
            {
                label: i18n.t('mist.applicationMenu.app.hide', { app: Settings.appName }),
                accelerator: 'Command+H',
                role: 'hide',
            },
            {
                label: i18n.t('mist.applicationMenu.app.hideOthers', { app: Settings.appName }),
                accelerator: 'Command+Alt+H',
                role: 'hideothers',
            },
            {
                label: i18n.t('mist.applicationMenu.app.showAll', { app: Settings.appName }),
                role: 'unhide',
            },
            {
                type: 'separator',
            }
        );
    }
    fileMenu.push(
        { label: i18n.t('mist.applicationMenu.app.quit', { app: Settings.appName }),
            accelerator: 'CommandOrControl+Q',
            click() {
                app.quit();
            },
        });
    menu.push({
        label: i18n.t('mist.applicationMenu.app.label', { app: Settings.appName }),
        submenu: fileMenu,
    });

    // ACCOUNTS
    menu.push({
        label: i18n.t('mist.applicationMenu.accounts.label'),
        submenu: [
            {
                label: i18n.t('mist.applicationMenu.accounts.newAccount'),
                accelerator: 'CommandOrControl+N',
                click() {
                    Windows.createPopup('requestAccount', {
                        electronOptions: {
                            width: 420, height: 230, alwaysOnTop: true,
                        },
                    });
                },
            },
            {
                label: i18n.t('mist.applicationMenu.accounts.importPresale'),
                accelerator: 'CommandOrControl+I',
                enabled: ethereumNode.isMainNetwork,
                click() {
                    Windows.createPopup('importAccount', {
                        electronOptions: {
                            width: 600, height: 370, alwaysOnTop: true,
                        },
                    });
                },
            },
            {
                type: 'separator',
            },
            {
                label: i18n.t('mist.applicationMenu.accounts.backup'),
                submenu: [
                    {
                        label: i18n.t('mist.applicationMenu.accounts.backupKeyStore'),
                        click() {
                            let path = Settings.userHomePath;

                            // eth
                            if (ethereumNode.isEth) {
                                if (process.platform === 'win32')
                                    { path = `${Settings.appDataPath}\\Web3\\keys`; }
                                else
                                    { path += '/.web3/keys'; }

                            // geth
                            } else {
                                if (process.platform === 'darwin')
                                    { path += '/Library/Ethereum/keystore'; }

                                if (process.platform === 'freebsd' ||
                                   process.platform === 'linux' ||
                                   process.platform === 'sunos')
                                    { path += '/.ethereum/keystore'; }

                                if (process.platform === 'win32')
                                    { path = `${Settings.appDataPath}\\Ethereum\\keystore`; }
                            }

                            shell.showItemInFolder(path);
                        },
                    }, {
                        label: i18n.t('mist.applicationMenu.accounts.backupMist'),
                        click() {
                            shell.openItem(Settings.userDataPath);
                        },
                    },
                ],
            },
        ],
    });

    // EDIT
    menu.push({
        label: i18n.t('mist.applicationMenu.edit.label'),
        submenu: [
            {
                label: i18n.t('mist.applicationMenu.edit.undo'),
                accelerator: 'CommandOrControl+Z',
                role: 'undo',
            },
            {
                label: i18n.t('mist.applicationMenu.edit.redo'),
                accelerator: 'Shift+CommandOrControl+Z',
                role: 'redo',
            },
            {
                type: 'separator',
            },
            {
                label: i18n.t('mist.applicationMenu.edit.cut'),
                accelerator: 'CommandOrControl+X',
                role: 'cut',
            },
            {
                label: i18n.t('mist.applicationMenu.edit.copy'),
                accelerator: 'CommandOrControl+C',
                role: 'copy',
            },
            {
                label: i18n.t('mist.applicationMenu.edit.paste'),
                accelerator: 'CommandOrControl+V',
                role: 'paste',
            },
            {
                label: i18n.t('mist.applicationMenu.edit.selectAll'),
                accelerator: 'CommandOrControl+A',
                role: 'selectall',
            },
        ],
    });

    const genSwitchLanguageFunc = lang_code => function (menuItem, browserWindow) {
        browserWindow.webContents.executeJavaScript(
            `TAPi18n.setLanguage("${lang_code}");`
        );
        ipc.emit('backendAction_setLanguage', {}, lang_code);
    };
    const currentLanguage = i18n.getBestMatchedLangCode(global.language);

    const languageMenu =
    Object.keys(i18n.options.resources)
    .filter(lang_code => lang_code != 'dev')
    .map((lang_code) => {
        menuItem = {
            label: i18n.t(`mist.applicationMenu.view.langCodes.${lang_code}`),
            type: 'checkbox',
            checked: (currentLanguage === lang_code),
            click: genSwitchLanguageFunc(lang_code),
        };
        return menuItem;
    });
    const defaultLang = i18n.getBestMatchedLangCode(app.getLocale());
    languageMenu.unshift({
        label: i18n.t('mist.applicationMenu.view.default'),
        click: genSwitchLanguageFunc(defaultLang),
    }, {
        type: 'separator',
    });

    // VIEW
    menu.push({
        label: i18n.t('mist.applicationMenu.view.label'),
        submenu: [
            {
                label: i18n.t('mist.applicationMenu.view.fullscreen'),
                accelerator: switchForSystem({
                    darwin: 'Command+Control+F',
                    default: 'F11',
                }),
                click() {
                    const mainWindow = Windows.getByType('main');

                    mainWindow.window.setFullScreen(!mainWindow.window.isFullScreen());
                },
            },
            {
                label: i18n.t('mist.applicationMenu.view.languages'),
                submenu: languageMenu,
            },
        ],
    });


    // DEVELOP
    let devToolsMenu = [];

    // change for wallet
    if (Settings.uiMode === 'mist') {
        devtToolsSubMenu = [{
            label: i18n.t('mist.applicationMenu.develop.devToolsMistUI'),
            accelerator: 'Alt+CommandOrControl+I',
            click() {
                if (curWindow = BrowserWindow.getFocusedWindow())
                    { curWindow.toggleDevTools(); }
            },
        }, {
            type: 'separator',
        }];

        // add webviews
        webviews.forEach((webview) => {
            devtToolsSubMenu.push({
                label: i18n.t('mist.applicationMenu.develop.devToolsWebview', { webview: webview.name }),
                click() {
                    Windows.getByType('main').send('uiAction_toggleWebviewDevTool', webview._id);
                },
            });
        });

    // wallet
    } else {
        devtToolsSubMenu = [{
            label: i18n.t('mist.applicationMenu.develop.devToolsWalletUI'),
            accelerator: 'Alt+CommandOrControl+I',
            click() {
                if (curWindow = BrowserWindow.getFocusedWindow())
                    { curWindow.toggleDevTools(); }
            },
        }];
    }

    const externalNodeMsg = (ethereumNode.isOwnNode) ? '' : ` (${i18n.t('mist.applicationMenu.develop.externalNode')})`;
    devToolsMenu = [{
        label: i18n.t('mist.applicationMenu.develop.devTools'),
        submenu: devtToolsSubMenu,
    }, {
        label: i18n.t('mist.applicationMenu.develop.runTests'),
        enabled: (Settings.uiMode === 'mist'),
        click() {
            Windows.getByType('main').send('uiAction_runTests', 'webview');
        },
    }, {
        label: i18n.t('mist.applicationMenu.develop.logFiles') + externalNodeMsg,
        enabled: ethereumNode.isOwnNode,
        click() {
            try {
                shell.showItemInFolder(`${Settings.userDataPath}/node.log`);
            } catch (e) {
                log.info(e);
                log = 'Couldn\'t load log file.';
            }
        },
    },
    ];


    // add node switching menu
    devToolsMenu.push({
        type: 'separator',
    });
    // add node switch
    if (process.platform === 'darwin' || process.platform === 'win32') {
        const nodeSubmenu = [];

        const ethClient = ClientBinaryManager.getClient('eth'),
            gethClient = ClientBinaryManager.getClient('geth');

        if (gethClient) {
            nodeSubmenu.push(
                {
                    label: `Geth ${gethClient.version} (Go)`,
                    checked: ethereumNode.isOwnNode && ethereumNode.isGeth,
                    enabled: ethereumNode.isOwnNode,
                    type: 'checkbox',
                    click() {
                        restartNode('geth');
                    },
                }
            );
        }

        if (ethClient) {
            nodeSubmenu.push(
                {
                    label: `Eth ${ethClient.version} (C++)`,
                    checked: ethereumNode.isOwnNode && ethereumNode.isEth,
                    enabled: ethereumNode.isOwnNode,
                    // enabled: false,
                    type: 'checkbox',
                    click() {
                        restartNode('eth');
                    },
                }
            );
        }

        devToolsMenu.push({
            label: i18n.t('mist.applicationMenu.develop.ethereumNode'),
            submenu: nodeSubmenu,
        });
    }

    // add network switch
    devToolsMenu.push({
        label: i18n.t('mist.applicationMenu.develop.network'),
        submenu: [
            {
                label: i18n.t('mist.applicationMenu.develop.mainNetwork'),
                accelerator: 'CommandOrControl+Shift+1',
                checked: ethereumNode.isOwnNode && ethereumNode.isMainNetwork,
                enabled: ethereumNode.isOwnNode && !ethereumNode.isMainNetwork,
                type: 'checkbox',
                click() {
                    restartNode(ethereumNode.type, 'main');
                },
            },
            {
                label: 'Testnet (Morden)',
                accelerator: 'CommandOrControl+Shift+2',
                checked: ethereumNode.isOwnNode && ethereumNode.isTestNetwork,
                enabled: ethereumNode.isOwnNode && !ethereumNode.isTestNetwork,
                type: 'checkbox',
                click() {
                    restartNode(ethereumNode.type, 'test');
                },
            },
        ] });


    devToolsMenu.push({
        label: (global.mining) ? i18n.t('mist.applicationMenu.develop.stopMining') : i18n.t('mist.applicationMenu.develop.startMining'),
        accelerator: 'CommandOrControl+Shift+M',
        enabled: ethereumNode.isOwnNode && ethereumNode.isTestNetwork,
        click() {
            if (!global.mining) {
                ethereumNode.send('miner_start', [1])
                    .then((ret) => {
                        log.info('miner_start', ret.result);

                        if (ret.result) {
                            global.mining = true;
                            createMenu(webviews);
                        }
                    })
                    .catch((err) => {
                        log.error('miner_start', err);
                    });
            } else {
                ethereumNode.send('miner_stop', [1])
                    .then((ret) => {
                        log.info('miner_stop', ret.result);

                        if (ret.result) {
                            global.mining = false;
                            createMenu(webviews);
                        }
                    })
                    .catch((err) => {
                        log.error('miner_stop', err);
                    });
            }
        },
    });


    menu.push({
        label: ((global.mining) ? '⛏ ' : '') + i18n.t('mist.applicationMenu.develop.label'),
        submenu: devToolsMenu,
    });

    // WINDOW
    menu.push({
        label: i18n.t('mist.applicationMenu.window.label'),
        role: 'window',
        submenu: [
            {
                label: i18n.t('mist.applicationMenu.window.minimize'),
                accelerator: 'CommandOrControl+M',
                role: 'minimize',
            },
            {
                label: i18n.t('mist.applicationMenu.window.close'),
                accelerator: 'CommandOrControl+W',
                role: 'close',
            },
            {
                type: 'separator',
            },
            {
                label: i18n.t('mist.applicationMenu.window.toFront'),
                role: 'arrangeInFront:',
                role: 'front',
            },
        ],
    });

    // HELP
    const helpMenu = [];

    if (process.platform === 'freebsd' || process.platform === 'linux' ||
            process.platform === 'sunos' || process.platform === 'win32') {
        helpMenu.push(
            {
                label: i18n.t('mist.applicationMenu.app.about', { app: Settings.appName }),
                click() {
                    Windows.createPopup('about', {
                        electronOptions: {
                            width: 420,
                            height: 230,
                            alwaysOnTop: true,
                        },
                    });
                },
            },
            {
                label: i18n.t('mist.applicationMenu.app.checkForUpdates'),
                click() {
                    updateChecker.runVisibly();
                },
            }
        );
    }
    helpMenu.push({
        label: i18n.t('mist.applicationMenu.help.reportBug'),
        click() {
            shell.openExternal('https://github.com/ethereum/mist/issues');
        },
    });

    menu.push({
        label: i18n.t('mist.applicationMenu.help.label'),
        role: 'help',
        submenu: helpMenu,
    });
    return menu;
};


module.exports = createMenu;
