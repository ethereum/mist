const app = require('app');
const BrowserWindow = require('browser-window');
const popupWindow = require('./popupWindow.js');
const MenuItem = require('menu-item');
const Menu = require('menu');
const shell = require('electron').shell;
const config = require('../config');
const ipc = require('electron').ipcMain;
const ethereumNodes = require('./ethereumNodes.js');
const fs = require('fs');
const dialog = require('dialog');


// create menu
// null -> null
var createMenu = function(webviews) {
    webviews = webviews || [];

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
    webviews = webviews || [];

    // APP
    menu.push({
        label: i18n.t('mist.applicationMenu.app.label', {app: config.name}),
        submenu: [
            {
                label: i18n.t('mist.applicationMenu.app.about', {app: config.name}),
                click: function(){
                    popupWindow.show('about_'+ global.mode, {width: 420, height: 230, alwaysOnTop: true});
                }
            },
            {
                label: i18n.t('mist.applicationMenu.app.quit', {app: config.name}),
                accelerator: 'CommandOrControl+Q',
                click: function(){
                    app.quit();
                }
            }
        ]
    });

      // ACCOUNTS
    menu.push({
        label: i18n.t('mist.applicationMenu.accounts.label'),
        submenu: [
            {
                label: i18n.t('mist.applicationMenu.accounts.newAccount'),
                accelerator: 'CommandOrControl+N',
                click: function(){
                    popupWindow.show('requestAccount', {width: 400, height: 230, alwaysOnTop: true});
                }
            },
            {
                label: i18n.t('mist.applicationMenu.accounts.importPresale'),
                accelerator: 'CommandOrControl+I',
                enabled: (global.network === 'main'),            
                click: function(){
                    popupWindow.show('importAccount', {width: 600, height: 370, alwaysOnTop: true});
                }
            }, 
            {
                type: 'separator'
            },
            {
                label: i18n.t('mist.applicationMenu.accounts.backup'),
                submenu: [
                    {
                        label: i18n.t('mist.applicationMenu.accounts.backupKeyStore'),
                        click: function(){
                            var path = global.path.HOME;

                            // eth
                            if(global.nodes.eth) {
                                if(process.platform === 'win32')
                                    path = global.path.APPDATA + '\\Web3\\keys';
                                else
                                    path += '/.web3/keys';
                            
                            // geth
                            } else {
                                if(process.platform === 'darwin')
                                    path += '/Library/Ethereum/keystore';

                                if(process.platform === 'freebsd' ||
                                   process.platform === 'linux' ||
                                   process.platform === 'sunos')
                                    path += '/.ethereum/keystore';

                                if(process.platform === 'win32')
                                    path = global.path.APPDATA + '\\Ethereum\\keystore';
                            }

                            shell.showItemInFolder(path);
                        }
                    },{
                        label: i18n.t('mist.applicationMenu.accounts.backupMist'),
                        click: function(){
                            shell.showItemInFolder(global.path.USERDATA);
                        }
                    }
                ]
            }
        ]
    });

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
                    if(global.mainWindow && global.mainWindow.webContents && !global.mainWindow.webContents.isDestroyed())
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
                if(global.mainWindow && global.mainWindow.webContents && !global.mainWindow.webContents.isDestroyed())
                    global.mainWindow.webContents.send('runTests', 'webview');
            }
        },{
            label: i18n.t('mist.applicationMenu.develop.logFiles'),
            click: function(){
                var log = '';
                try {
                    log = fs.readFileSync(global.path.USERDATA + '/node.log', {encoding: 'utf8'});
                    log = '...'+ log.slice(-1000);
                } catch(e){
                    console.log(e);
                    log = 'Couldn\'t load log file.';
                };

                dialog.showMessageBox({
                    type: "info",
                    buttons: ['OK'],
                    message: 'Log file',
                    detail: log
                }, function(){
                });
            }
        }
    ];



                   

    // add node switching menu
    devToolsMenu.push({
        type: 'separator'
    });
    // add node switch
    if(process.platform === 'darwin' || process.platform === 'win32') {
        devToolsMenu.push({
            label: i18n.t('mist.applicationMenu.develop.ethereumNode'),
            submenu: [
              {
                label: 'Geth 1.3.5 (Go)',
                checked: !!global.nodes.geth,
                enabled: !!((global.nodes.geth || global.nodes.eth) && !global.nodes.geth),
                type: 'checkbox',
                click: function(){
                    ethereumNodes.stopNodes(function(){
                        popupWindow.loadingWindow.show();
                        ethereumNodes.startNode('geth', false, function(){
                            popupWindow.loadingWindow.hide();
                            global.mainWindow.loadURL(global.interfaceAppUrl);
                            createMenu(webviews);
                        });
                    });
                }
              },
              {
                label: 'Eth 1.2.1 (C++) [experimental!]',
                checked: !!global.nodes.eth,
                enabled: !!((global.nodes.geth || global.nodes.eth) && !global.nodes.eth),
                type: 'checkbox',
                click: function(){
                    ethereumNodes.stopNodes(function(){
                        popupWindow.loadingWindow.show();
                        ethereumNodes.startNode('eth', false, function(){
                            popupWindow.loadingWindow.hide();
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
            accelerator: 'Alt+CommandOrControl+1',
            checked: !!(global.network === 'main'),
            enabled: !!((global.nodes.geth || global.nodes.eth) && global.network !== 'main'),
            type: 'checkbox',
            click: function(){
                var geth = !!global.nodes.geth;

                ethereumNodes.stopNodes(function(){
                    popupWindow.loadingWindow.show();
                    ethereumNodes.startNode(geth ? 'geth' : 'eth', false, function(){
                        popupWindow.loadingWindow.hide();
                        global.mainWindow.loadURL(global.interfaceAppUrl);
                        createMenu(webviews);
                    });
                });
            }
          },
          {
            label: 'Testnet (Morden)',
            accelerator: 'Alt+CommandOrControl+2',                
            checked: !!(global.network === 'test'),
            enabled: !!((global.nodes.geth || global.nodes.eth) && global.network !== 'test'),
            type: 'checkbox',
            click: function(){
                var geth = !!global.nodes.geth;

                ethereumNodes.stopNodes(function(){
                    popupWindow.loadingWindow.show();
                    ethereumNodes.startNode(geth ? 'geth' : 'eth', true, function(){
                        popupWindow.loadingWindow.hide();
                        global.mainWindow.loadURL(global.interfaceAppUrl);
                        createMenu(webviews);
                    });
                });
            }
          }
    ]});

    devToolsMenu.push({
        label: (global.mining) ? i18n.t('mist.applicationMenu.develop.stopMining') : i18n.t('mist.applicationMenu.develop.startMining'),
        accelerator: 'CommandOrControl+M',
        enabled: !!((global.nodes.geth || global.nodes.eth) && global.network === 'test'),
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