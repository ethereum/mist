const app = require('app');
const BrowserWindow = require('browser-window');
const MenuItem = require('menu-item');
const Menu = require('menu');
const config = require('./config');
const ipc = require('ipc');

// TODO change selector to role
/*
+  * `click` Function - Will be called with `click(menuItem, browserWindow)` when
-  * `selector` String - Call the selector of first responder when clicked (OS      +     the menu item is clicked
-     X only)       +  * `role` String - Define the action of the menu item, when specified the
+     `click` property will be ignored
*/

// create menu
// null -> null
var createMenu = function(webviews) {
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
            click: function(){
                global.mainWindow.webContents.send('runTests', 'webview');
            }
        },{
            type: 'separator'
        },{
            label: i18n.t('mist.applicationMenu.develop.ethereumCore'),
            submenu: [
              {
                label: 'Geth 2.2',
                checked: true,
                type: 'checkbox'
              },
              {
                label: 'Eth 0.1',
                type: 'checkbox',
                enabled: false
              }
        ]},{
            label: i18n.t('mist.applicationMenu.develop.network'),
            submenu: [
              {
                label: i18n.t('mist.applicationMenu.develop.mainNetwork'),
                type: 'checkbox',
                checked: true
              },
              {
                label: 'Testnet (Morden)',
                type: 'checkbox',
                enabled: false
              }
        ]}];

    menu.push({
        label: i18n.t('mist.applicationMenu.develop.label'),
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