const app = require('app');
const BrowserWindow = require('browser-window');
const MenuItem = require('menu-item');
const Menu = require('menu');
const shell = require('electron').shell;
const config = require('../config');
const ipc = require('electron').ipcMain;
const ethereumNodes = require('./ethereumNodes.js');


// create menu
// null -> null
var createMenu = function(webviews) {
    // re create connection
    if(global.nodeConnector.socket.writable) {
        global.nodeConnector.destroy();
    }
    global.nodeConnector.connect();

    const menu = Menu.buildFromTemplate(menuTempl(webviews));
    Menu.setApplicationMenu(menu);
};

// create a menu template
// null -> obj
var menuTempl = function(webviews) {
    const menu = []

    // APP
    menu.push({
        label: i18n.t('mist.applicationMenu.app.label', {app: config.name}),
        submenu: [
            {
                label: i18n.t('mist.applicationMenu.app.about', {app: config.name}),
                role: 'about'
            },
            {
                label: i18n.t('mist.applicationMenu.app.quit', {app: config.name}),
                accelerator: 'CommandOrControl+Q',
                click: function(){
                    app.quit();
                }
            }
        ]
    })

    // EDIT
    menu.push({
        label: i18n.t('mist.applicationMenu.edit.label'),
        submenu: [
            {
                label: i18n.t('mist.applicationMenu.edit.undo'),
                accelerator: 'CommandOrControl+Z',
                role: 'undo'
            },
            {
                label: i18n.t('mist.applicationMenu.edit.redo'),
                accelerator: 'Shift+CommandOrControl+Z',
                role: 'redo'
            },
            {
                type: 'separator'
            },
            {
                label: i18n.t('mist.applicationMenu.edit.cut'),
                accelerator: 'CommandOrControl+X',
                role: 'cut'
            },
            {
                label: i18n.t('mist.applicationMenu.edit.copy'),
                accelerator: 'CommandOrControl+C',
                role: 'copy'
            },
            {
                label: i18n.t('mist.applicationMenu.edit.paste'),
                accelerator: 'CommandOrControl+V',
                role: 'paste'
            },
            {
                label: i18n.t('mist.applicationMenu.edit.selectAll'),
                accelerator: 'CommandOrControl+A',
                role: 'selectall'
            },
        ]
    })

    // VIEW
    menu.push({
        label: i18n.t('mist.applicationMenu.view.label'),
        submenu: [
            {
                label: i18n.t('mist.applicationMenu.view.fullscreen'),
                accelerator: 'CommandOrControl+F',
                click: function(){
                    global.mainWindow.setFullScreen(!global.mainWindow.isFullScreen());
                }
            }
        ]
    })

    // BACKUP
    menu.push({
        label: i18n.t('mist.applicationMenu.backup.label'),
        submenu: [
            {
                label: i18n.t('mist.applicationMenu.backup.backupKeyStore'),
                click: function(){
                    var path = global.path.HOME;

                    if(process.platform === 'darwin')
                        path += '/Library/Ethereum/keystore';

                    if(process.platform === 'freebsd' ||
                       process.platform === 'linux' ||
                       process.platform === 'sunos')
                        path += '/.ethereum/keystore';

                    if(process.platform === 'win32')
                        path = global.path.APPDATA + '\\Ethereum\\keystore';

                    shell.showItemInFolder(path);
                }
            },{
                label: i18n.t('mist.applicationMenu.backup.backupMist'),
                click: function(){
                    shell.showItemInFolder(global.path.USERDATA);
                }
            }
        ]
    })

    // DEVELOP
    var devToolsMenu = [];

    // change for wallet
    if(global.mode === 'mist') {
        devtToolsSubMenu = [{
            label: i18n.t('mist.applicationMenu.develop.devToolsMistUI'),
            accelerator: 'Alt+CommandOrControl+I',
            click: function() {
                if(curWindow = BrowserWindow.getFocusedWindow())
                    curWindow.toggleDevTools();
            }
        },{
            type: 'separator'
        }];

        // add webviews
        webviews.forEach(function(webview){
            devtToolsSubMenu.push({
                label: i18n.t('mist.applicationMenu.develop.devToolsWebview', {webview: webview.name}),
                click: function() {
                    global.mainWindow.webContents.send('toggleWebviewDevTool', webview._id);
                }
            });
        });

    // wallet
    } else {
        devtToolsSubMenu = [{
            label: i18n.t('mist.applicationMenu.develop.devToolsWalletUI'),
            accelerator: 'Alt+CommandOrControl+I',
            click: function() {
                if(curWindow = BrowserWindow.getFocusedWindow())
                    curWindow.toggleDevTools();
            }
        }];
    }

    devToolsMenu = [{
            label: i18n.t('mist.applicationMenu.develop.devTools'),
            submenu: devtToolsSubMenu
        },{
            label: i18n.t('mist.applicationMenu.develop.runTests'),
            enabled: (global.mode === 'mist'),
            click: function(){
                global.mainWindow.webContents.send('runTests', 'webview');
            }
        }
    ];

    // add node switching menu
    if(global.nodes.geth || global.nodes.eth) {
        devToolsMenu.push({
            type: 'separator'
        });
        // add node switch
        if(process.platform === 'darwin' || process.platform === 'win32') {
            devToolsMenu.push({
                label: i18n.t('mist.applicationMenu.develop.ethereumNode'),
                submenu: [
                  {
                    label: 'Geth 1.3.3 (Go)',
                    checked: !!global.nodes.geth,
                    enabled: !global.nodes.geth,
                    type: 'checkbox',
                    click: function(){
                        ethereumNodes.stopNodes(function(){
                            ethereumNodes.startNode('geth', false, function(){
                                global.mainWindow.loadURL(global.interfaceAppUrl);
                                createMenu(webviews);
                            });
                        });
                    }
                  },
                  {
                    label: 'Eth 1.1.0 develop (C++)',
                    type: 'checkbox',
                    checked: !!global.nodes.eth,
                    enabled: !global.nodes.eth,
                    click: function(){
                        ethereumNodes.stopNodes(function(){
                            ethereumNodes.startNode('eth', false, function(){
                                global.mainWindow.loadURL(global.interfaceAppUrl);
                                createMenu(webviews);
                            });
                        });
                    }
                  }
            ]});
        }
        // add network switch
        devToolsMenu.push({
            label: i18n.t('mist.applicationMenu.develop.network'),
            submenu: [
              {
                label: i18n.t('mist.applicationMenu.develop.mainNetwork'),
                type: 'checkbox',
                checked: (global.network === 'main'),
                enabled: !(global.network === 'main'),
                click: function(){
                    var geth = !!global.nodes.geth;

                    ethereumNodes.stopNodes(function(){
                        ethereumNodes.startNode(geth ? 'geth' : 'eth', false, function(){
                            global.mainWindow.loadURL(global.interfaceAppUrl);
                            createMenu(webviews);
                        });
                    });
                }
              },
              {
                label: 'Testnet (Morden)',
                checked: (global.network === 'test'),
                enabled: !(global.network === 'test'),
                click: function(){
                    var geth = !!global.nodes.geth;

                    ethereumNodes.stopNodes(function(){
                        ethereumNodes.startNode(geth ? 'geth' : 'eth', true, function(){
                            global.mainWindow.loadURL(global.interfaceAppUrl);
                            createMenu(webviews);
                        });
                    });
                }
              }
        ]});

        devToolsMenu.push({
            label: (global.mining) ? i18n.t('mist.applicationMenu.develop.stopMining') : i18n.t('mist.applicationMenu.develop.startMining'),
            enabled: (global.network === 'test'),
            click: function(){
                // TODO remove on new RPC
                global.nodeConnector.connect();

                if(!global.mining) {
                    global.nodeConnector.send('miner_start', [1], function(e, result){
                        console.log('miner_start', result, e);
                        if(result === true) {
                            global.mining = !global.mining;
                            createMenu(webviews);
                        }
                    });
                } else {
                    global.nodeConnector.send('miner_stop', [], function(e, result){
                        console.log('miner_stop', result, e);
                        if(result === true) {
                            global.mining = !global.mining;
                            createMenu(webviews);
                        }
                    });
                }
            }
        });
    }


    menu.push({
        label: ((global.mining) ? '⛏ ' : '') + i18n.t('mist.applicationMenu.develop.label'),
        submenu: devToolsMenu
    })

    // WINDOW
    menu.push({
        label: i18n.t('mist.applicationMenu.window.label'),
        role: 'window',
        submenu: [
            {
                label: i18n.t('mist.applicationMenu.window.minimize'),
                accelerator: 'CommandOrControl+M',
                role: 'minimize'
            },
            {
                label: i18n.t('mist.applicationMenu.window.close'),
                accelerator: 'CommandOrControl+W',
                role: 'close'
            },
            {
                type: 'separator'
            },
            {
                label: i18n.t('mist.applicationMenu.window.toFront'),
                role: 'arrangeInFront:',
                role: 'front'
            },
        ]
    })

    // HELP
    if(process.platform === 'darwin') {
        menu.push({
            label: i18n.t('mist.applicationMenu.help.label'),
            role: 'help',
            submenu: []
        });
    }

    return menu;
};


module.exports = createMenu;