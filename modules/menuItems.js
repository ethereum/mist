const { app, BrowserWindow, ipcMain: ipc, Menu, shell, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const Windows = require('./windows');
const Settings = require('./settings');
const log = require('./utils/logger').create('menuItems');
const updateChecker = require('./updateChecker');
const ethereumNode = require('./ethereumNode.js');
const swarmNode = require('./swarmNode.js');
const ClientBinaryManager = require('./clientBinaryManager');

const version = require('../package').version;


// Make easier to return values for specific systems
const switchForSystem = function (options) {
    if (process.platform in options) {
        return options[process.platform];
    } else if ('default' in options) {
        return options.default;
    }
    return null;
};


// create menu
// null -> null
const createMenu = function (webviews) {
    webviews = webviews || [];

    const menu = Menu.buildFromTemplate(menuTempl(webviews));
    Menu.setApplicationMenu(menu);
};


const restartNode = function (newType, newNetwork, syncMode, webviews) {
    newNetwork = newNetwork || ethereumNode.network;

    log.info('Switch node', newType, newNetwork);

    return ethereumNode.restart(newType, newNetwork, syncMode)
        .then(() => {
            Windows.getByType('main').load(global.interfaceAppUrl);

            createMenu(webviews);
            log.info('Node switch successful.');
        })
        .catch((err) => {
            log.error('Error switching node', err);
        });
};


const startMining = (webviews) => {
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
};

const stopMining = (webviews) => {
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
                label: i18n.t('mist.applicationMenu.app.checkForNodeUpdates'),
                click() {
                    // remove skipVersion
                    fs.writeFileSync(
                        path.join(Settings.userDataPath, 'skippedNodeVersion.json'),
                        '' // write no version
                    );

                    // true = will restart after updating and user consent
                    ClientBinaryManager.init(true);
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
        label: i18n.t('mist.applicationMenu.file.label'),
        submenu: [
            {
                label: i18n.t('mist.applicationMenu.file.newAccount'),
                accelerator: 'CommandOrControl+N',
                click() {
                    Windows.createPopup('requestAccount', {
                        ownerId : Windows.getByType('main').id,
                        electronOptions: {
                            width: 420, height: 380, alwaysOnTop: true,
                        },
                    });
                },
            },
            {
                label: i18n.t('mist.applicationMenu.file.importPresale'),
                accelerator: 'CommandOrControl+I',
                //cranelv: open this menu in all nets. 2o17-11-13
//                enabled: ethereumNode.isMainNetwork,
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
                label: i18n.t('mist.applicationMenu.file.backup'),
                submenu: [
                    {
                        label: i18n.t('mist.applicationMenu.file.backupKeyStore'),
                        click() {
                            let kestorePath = 'wanchain';
                            if(ethereumNode.network === 'pluto')
                            {
                                kestorePath = 'wanchain/pluto';
                            }
                            let userPath = Settings.userHomePath;

                            // eth
                            if (ethereumNode.isEth) {
                                if (process.platform === 'win32') {
                                    userPath = `${Settings.appDataPath}\\Web3\\keys`;
                                } else {
                                    userPath += '/.web3/keys';
                                }

                            // geth
                            } else {
                                if (process.platform === 'darwin') {
                                    userPath += '/Library/'+kestorePath+'/keystore';
                                }

                                if (process.platform === 'freebsd' ||
                                process.platform === 'linux' ||
                                process.platform === 'sunos') {
                                    userPath += '/.'+kestorePath+'/keystore';
                                }

                                if (process.platform === 'win32') {
                                    userPath = `${Settings.appDataPath}\\${kestorePath}\\keystore`;
                                }
                            }

                            shell.showItemInFolder(userPath);
                        },
                    }, {
                        label: i18n.t('mist.applicationMenu.file.backupMist'),
                        click() {
                            shell.openItem(Settings.userDataPath);
                        },
                    },
                ],
            },
            // {
            //     type: 'separator',
            // },
            // {
            //     label: i18n.t('mist.applicationMenu.file.swarmUpload'),
            //     accelerator: 'Shift+CommandOrControl+U',
            //     click() {
            //         const focusedWindow = BrowserWindow.getFocusedWindow();
            //         const paths = dialog.showOpenDialog(focusedWindow, {
            //             properties: ['openFile', 'openDirectory']
            //         });
            //         if (paths && paths.length === 1) {
            //             const isDir = fs.lstatSync(paths[0]).isDirectory();
            //             const defaultPath = path.join(paths[0], 'index.html');
            //             const uploadConfig = {
            //                 path: paths[0],
            //                 kind: isDir ? 'directory' : 'file',
            //                 defaultFile: fs.existsSync(defaultPath) ? '/index.html' : null
            //             };
            //             swarmNode.upload(uploadConfig).then((hash) => {
            //                 focusedWindow.webContents.executeJavaScript(`
            //                   Tabs.update('browser', {$set: {
            //                       url: 'bzz://${hash}',
            //                       redirect: 'bzz://${hash}'
            //                   }});
            //                   LocalStore.set('selectedTab', 'browser');
            //                 `);
            //                 console.log('Hash uploaded:', hash);
            //             }).catch(e => console.log(e));
            //         }
            //     }
            // }
            ]
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

    // LANGUAGE (VIEW)
    const switchLang = langCode => function (menuItem, browserWindow) {
        try {
            // update i18next instance in browserWindow (Mist meteor interface)
            browserWindow.webContents.executeJavaScript(
               `TAPi18n.setLanguage("${langCode}");`
            );

            // set Accept_Language header
            const session = browserWindow.webContents.session;
            session.setUserAgent(session.getUserAgent(), langCode);

            // set navigator.language (dev console only)
            // browserWindow.webContents.executeJavaScript(
            //     `Object.defineProperty(navigator, 'language, {
            //         get() { return ${langCode}; }
            //     });`
            // );

            // reload browserWindow to apply language change
            // browserWindow.webContents.reload();
        } catch (err) {
            log.error(err);
        } finally {
            Settings.language = langCode;
            ipc.emit('backendAction_setLanguage');
        }
    };

    const currentLanguage = Settings.language;
    const languageMenu = Object.keys(i18n.options.resources)
    .filter(langCode => langCode !== 'dev')
    .map((langCode) => {
        const menuItem = {
            label: i18n.t(`mist.applicationMenu.view.langCodes.${langCode}`),
            type: 'checkbox',
            checked: (langCode === currentLanguage),
            click: switchLang(langCode),
        };
        return menuItem;
    });

    languageMenu.unshift({
        label: i18n.t('mist.applicationMenu.view.default'),
        click: switchLang(i18n.getBestMatchedLangCode(app.getLocale())),
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
            // {
            //     label: i18n.t('mist.applicationMenu.view.languages'),
            //     submenu: languageMenu,
            // },
        ],
    });


    // DEVELOP
    const devToolsMenu = [];
    let devtToolsSubMenu;
    let curWindow;

    // change for wallet
    if (Settings.uiMode === 'mist') {
        devtToolsSubMenu = [{
            label: i18n.t('mist.applicationMenu.develop.devToolsMistUI'),
            accelerator: 'Alt+CommandOrControl+I',
            click() {
                curWindow = BrowserWindow.getFocusedWindow();
                if (curWindow) {
                    curWindow.toggleDevTools();
                }
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
                curWindow = BrowserWindow.getFocusedWindow();
                if (curWindow) {
                    curWindow.toggleDevTools();
                }
            },
        }];
    }

    const externalNodeMsg = (ethereumNode.isOwnNode) ? '' : ` (${i18n.t('mist.applicationMenu.develop.externalNode')})`;
    devToolsMenu.push({
        label: i18n.t('mist.applicationMenu.develop.devTools'),
        submenu: devtToolsSubMenu,
    });

    if (Settings.uiMode === 'mist') {
        devToolsMenu.push({
            label: i18n.t('mist.applicationMenu.develop.openRemix'),
            enabled: true,
            click() {
                Windows.createPopup('remix', {
                    url: 'https://remix.ethereum.org',
                    electronOptions: {
                        width: 1024,
                        height: 720,
                        center: true,
                        frame: true,
                        resizable: true,
                        titleBarStyle: 'default',
                    }
                });
            },
        });
    }

    devToolsMenu.push({
        label: i18n.t('mist.applicationMenu.develop.runTests'),
        enabled: (Settings.uiMode === 'mist'),
        click() {
            Windows.getByType('main').send('uiAction_runTests', 'webview');
        },
    });

    devToolsMenu.push({
        label: i18n.t('mist.applicationMenu.develop.logFiles') + externalNodeMsg,
        enabled: ethereumNode.isOwnNode,
        click() {
            try {
                shell.showItemInFolder(`${Settings.userDataPath}/node.log`);
            } catch (e) {
                log.info(e);
            }
        },
    });

    // add node switching menu
    devToolsMenu.push({
        type: 'separator',
    });


    // add node switch
    if (process.platform === 'darwin' || process.platform === 'win32') {
        const nodeSubmenu = [];

        const ethClient = ClientBinaryManager.getClient('eth');
        const gethClient = ClientBinaryManager.getClient('geth');

        if (gethClient) {
            nodeSubmenu.push({
                label: `Geth ${gethClient.version}`,
                checked: ethereumNode.isOwnNode && ethereumNode.isGeth,
                enabled: ethereumNode.isOwnNode,
                type: 'checkbox',
                click() {
                    restartNode('geth', null, 'fast', webviews);
                },
            });
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
    if (Settings.internal){
        devToolsMenu.push({
            label: i18n.t('mist.applicationMenu.develop.network'),
            submenu: [
                {
                    //label: i18n.t('mist.applicationMenu.develop.mainNetwork'),
                    label: 'Test network - beta',
                    accelerator: 'CommandOrControl+Alt+1',
                    checked: ethereumNode.isOwnNode && ethereumNode.isMainNetwork,
                    enabled: ethereumNode.isOwnNode,
                    type: 'checkbox',
                    click() {
                        restartNode(ethereumNode.type, 'main');
                    },
                },
                {
                    label: 'internal - Test network',
                    accelerator: 'CommandOrControl+Alt+3',
                    checked: ethereumNode.isOwnNode && ethereumNode.network === 'internal',
                    enabled: ethereumNode.isOwnNode,
                    type: 'checkbox',
                    click() {
                        restartNode(ethereumNode.type, 'internal');
                    },
                },
                {
                    label: 'Pluto - Test network',
                    accelerator: 'CommandOrControl+Alt+2',
                    checked: ethereumNode.isOwnNode && ethereumNode.network === 'pluto',
                    enabled: ethereumNode.isOwnNode,
                    type: 'checkbox',
                    click() {
                        restartNode(ethereumNode.type, 'pluto');
                    },
                }
            ] });
    } else {
        devToolsMenu.push({
            label: i18n.t('mist.applicationMenu.develop.network'),
            submenu: [
                {
                    //label: i18n.t('mist.applicationMenu.develop.mainNetwork'),
                    label: 'Test network - beta',
                    accelerator: 'CommandOrControl+Alt+1',
                    checked: ethereumNode.isOwnNode && ethereumNode.isMainNetwork,
                    enabled: ethereumNode.isOwnNode,
                    type: 'checkbox',
                    click() {
                        restartNode(ethereumNode.type, 'main');
                    },
                }
            ] });
    }


    // Light mode switch should appear when not in Solo Mode (dev network)
    // if (ethereumNode.isOwnNode && ethereumNode.isGeth && !ethereumNode.isDevNetwork) {
    //     devToolsMenu.push({
    //         label: 'Sync with Light client (beta)',
    //         enabled: true,
    //         checked: ethereumNode.isLightMode,
    //         type: 'checkbox',
    //         click() {
    //             restartNode('geth', null, (ethereumNode.isLightMode) ? 'fast' : 'light');
    //         },
    //     });
    // }

    // Enables mining menu: only in Solo mode and Ropsten network (testnet)
    if (ethereumNode.isOwnNode && (ethereumNode.isTestNetwork || ethereumNode.isDevNetwork)) {
        devToolsMenu.push({
            label: (global.mining) ? i18n.t('mist.applicationMenu.develop.stopMining') : i18n.t('mist.applicationMenu.develop.startMining'),
            accelerator: 'CommandOrControl+Shift+M',
            enabled: true,
            click() {
                if (global.mining) {
                    stopMining(webviews);
                } else {
                    startMining(webviews);
                }
            }
        });
    }

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
                role: 'front',
            },
        ],
    });

    // HELP
    const helpMenu = [];

    // if (process.platform === 'freebsd' || process.platform === 'linux' ||
    //         process.platform === 'sunos' || process.platform === 'win32') {
    //
    // }


    // const gitPath = 'wanchain/wanwallet';
    helpMenu.push(
        {
            label: "WanWallet Version: " + version,
            click() {
                shell.openExternal('https://github.com/wanchain/go-wanchain/releases');
            },
        },

        // {
        //     label: i18n.t('mist.applicationMenu.app.about', { app: Settings.appName }),
        //     click() {
        //         Windows.createPopup('about', {
        //             electronOptions: {
        //                 width: 420,
        //                 height: 230,
        //                 alwaysOnTop: true,
        //             },
        //         });
        //     },
        // },
        {
            label: i18n.t('mist.applicationMenu.app.checkForUpdates'),
            click() {
                updateChecker.runVisibly();
            },
        },

        {
        label: i18n.t('mist.applicationMenu.help.reportBug'),
        click() {
            shell.openExternal('https://github.com/wanchain/wanwallet');
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
