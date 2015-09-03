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
var createMenu = function(mainWindow, webviews) {
    const menu = Menu.buildFromTemplate(menuTempl(mainWindow, webviews));
    Menu.setApplicationMenu(menu);
};

// create a menu template
// null -> obj
var menuTempl = function(mainWindow, webviews) {
    const menu = []

    // APP
    menu.push({
        label: i18n.t('mist.applicationMenu.app.label', {app: config.name}),
        submenu: [
            {
                label: i18n.t('mist.applicationMenu.app.about', {app: config.name}),
                selector: 'orderFrontStandardAboutPanel:'
            },
            {
                label: i18n.t('mist.applicationMenu.app.quit', {app: config.name}),
                accelerator: 'Command+Q',
                selector: 'terminate:'
            }
        ]
    })

    // EDIT
    menu.push({
        label: i18n.t('mist.applicationMenu.edit.label'),
        submenu: [
            {
                label: i18n.t('mist.applicationMenu.edit.undo'),
                accelerator: 'Command+Z',
                selector: 'undo:'
            },
            {
                label: i18n.t('mist.applicationMenu.edit.redo'),
                accelerator: 'Shift+Command+Z',
                selector: 'redo:'
            },
            {
                type: 'separator'
            },
            {
                label: i18n.t('mist.applicationMenu.edit.cut'),
                accelerator: 'Command+X',
                selector: 'cut:'
            },
            {
                label: i18n.t('mist.applicationMenu.edit.copy'),
                accelerator: 'Command+C',
                selector: 'copy:'
            },
            {
                label: i18n.t('mist.applicationMenu.edit.paste'),
                accelerator: 'Command+V',
                selector: 'paste:'
            },
            {
                label: i18n.t('mist.applicationMenu.edit.selectAll'),
                accelerator: 'Command+A',
                selector: 'selectAll:'
            },
        ]
    })

    // VIEW
    menu.push({
        label: i18n.t('mist.applicationMenu.view.label'),
        submenu: [
            {
                label: i18n.t('mist.applicationMenu.view.fullscreen'),
                accelerator: 'Command+F',
                click: function(){
                    mainWindow.setFullScreen(!mainWindow.isFullScreen());
                }
            }
        ]
    })

    // DEVELOP
    var devtToolsMenu = [];

    // change for wallet
    if(global.mode === 'mist') {
        devtToolsMenu = [{
            label: i18n.t('mist.applicationMenu.develop.devToolsMistUI'),
            accelerator: 'Alt+Command+I',
            click: function() {
                if(curWindow = BrowserWindow.getFocusedWindow())
                    curWindow.toggleDevTools();
            }
        },{
            type: 'separator'
        }];

        // add webviews
        webviews.forEach(function(webview){
            devtToolsMenu.push({
                label: i18n.t('mist.applicationMenu.develop.devToolsWebview', {webview: webview.name}),
                click: function() {
                    mainWindow.webContents.send('toogleWebviewDevTool', webview._id);
                }
            });
        });

        devtToolsMenu = _.union(devtToolsMenu, [
            {
                type: 'separator'
            },
            {
                label: i18n.t('mist.applicationMenu.develop.runTests'),
                click: function(){

                    // var testWindow = new BrowserWindow({
                    //     width: 800,
                    //     height: 600,
                    //     icon: './icons/icon_128x128.png',
                    //     preload: __dirname +'/modules/preloader/mistAPI.js',
                    //     'node-integration': true,
                    //     'web-preferences': {
                    //         // 'web-security': false
                    //     }
                    // });
                    // testWindow.loadUrl('file://'+ __dirname + '/tests/mocha-in-browser/runner.html');                    

                    mainWindow.webContents.send('runTests', 'webview');
                }
            }
        ])

    // wallet
    } else {
        devtToolsMenu = [{
            label: i18n.t('mist.applicationMenu.develop.devToolsWalletUI'),
            accelerator: 'Alt+Command+I',
            click: function() {
                if(curWindow = BrowserWindow.getFocusedWindow())
                    curWindow.toggleDevTools();
            }
        }];
    }

    menu.push({
        label: i18n.t('mist.applicationMenu.develop.label'),
        submenu: devtToolsMenu
    })

    // WINDOW
    menu.push({
        label: i18n.t('mist.applicationMenu.window.label'),
        role: 'window',
        submenu: [
            {
                label: i18n.t('mist.applicationMenu.window.minimize'),
                accelerator: 'Command+M',
                selector: 'performMiniaturize:'
            },
            {
                label: i18n.t('mist.applicationMenu.window.close'),
                accelerator: 'Command+W',
                // click: function() {
                //     if(curWindow = BrowserWindow.getFocusedWindow())
                //         curWindow.hide();
                // }
                selector: 'performClose:'
            },
            {
                type: 'separator'
            },
            {
                label: i18n.t('mist.applicationMenu.window.toFront'),
                selector: 'arrangeInFront:',
                role: 'front'
            },
        ]
    })

    // HELP
    menu.push({
        label: i18n.t('mist.applicationMenu.help.label'),
        role: 'help',
        submenu: []
    });
    return menu;
};


module.exports = createMenu;