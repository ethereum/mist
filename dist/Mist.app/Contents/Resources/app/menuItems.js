const BrowserWindow = require('browser-window');
const MenuItem = require('menu-item');
const Menu = require('menu');
const config = require('./config');


// create menu
// null -> null
var createMenu = function() {
    const menu = Menu.buildFromTemplate(menuTempl());
    Menu.setApplicationMenu(menu);
};

// create a menu template
// null -> obj
var menuTempl = function() {
    const menu = []
    menu.push({
        label: config.name,
        submenu: [
            {
                label: 'About '+ config.name,
                selector: 'hide:'
            },
            {
                label: 'Quit '+ config.name,
                accelerator: 'Command+Q',
                selector: 'terminate:'
            }
        ]
    })
    menu.push({
        label: 'Edit',
        submenu: [
            {
                label: 'Undo',
                accelerator: 'Command+Z',
                selector: 'undo:'
            },
            {
                label: 'Redo',
                accelerator: 'Shift+Command+Z',
                selector: 'redo:'
            },
            {
                type: 'separator'
            },
            {
                label: 'Cut',
                accelerator: 'Command+X',
                selector: 'cut:'
            },
            {
                label: 'Copy',
                accelerator: 'Command+C',
                selector: 'copy:'
            },
            {
                label: 'Paste',
                accelerator: 'Command+V',
                selector: 'paste:'
            },
            {
                label: 'Select All',
                accelerator: 'Command+A',
                selector: 'selectAll:'
            },
        ]
    })
    menu.push({
        label: 'View',
        submenu: [
            // {
            //     label: 'Reload',
            //     accelerator: 'Command+R',
            //     click: function() {
            //         f(curWindow = BrowserWindow.getFocusedWindow())
            //             curWindow.reloadIgnoringCache();
            //         }
            // },
            {
                label: 'Toggle DevTools',
                accelerator: 'Alt+Command+I',
                click: function() {
                    if(curWindow = BrowserWindow.getFocusedWindow())
                        curWindow.toggleDevTools();
                }
            },
        ]
    })
    menu.push({
        label: 'Window',
        submenu: [
            {
                label: 'Minimize',
                accelerator: 'Command+M',
                selector: 'performMiniaturize:'
            },
            {
                label: 'Close',
                accelerator: 'Command+W',
                click: function() {
                    if(curWindow = BrowserWindow.getFocusedWindow())
                        curWindow.hide();
                }
                // selector: 'performClose:'
            },
            {
                type: 'separator'
            },
            {
                label: 'Bring All to Front',
                selector: 'arrangeInFront:'
            },
        ]
    })
    return menu;
};


module.exports = createMenu;