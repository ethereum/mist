import Windows from '../../windows';
import windowStateKeeper from 'electron-window-state';
import appMenu from '../../menuItems';
import { app } from 'electron';
import logger from '../../utils/logger';
const windowsLog = logger.create('windows');
import { quitApp } from '../ui/actions';


let mainWindow;

export function createCoreWindows() {
    return dispatch => {
        Windows.init();

        global.defaultWindow = windowStateKeeper({ defaultWidth: 1024 + 208, defaultHeight: 720 });

        // Create the browser window.
        mainWindow = Windows.create('main');

        // Delegating events to save window bounds on windowStateKeeper
        global.defaultWindow.manage(mainWindow.window);

        dispatch({ type: '[MAIN]:WINDOWS:CREATE_CORE' });
    }
}

export function startMainWindow() {
    return (dispatch, getState) => {
        dispatch({ type: '[MAIN]:WINDOWS:START_MAIN' });

        windowsLog.info(`Loading Interface at ${global.interfaceAppUrl}`);

        // Initialize listeners
        mainWindow.on('ready', () => {
            mainWindow.show();
        });

        mainWindow.load(global.interfaceAppUrl);

        mainWindow.on('closed', () => store.dispatch(quitApp()));

        // Initialize tabs
        const Tabs = global.db.getCollection('UI_tabs'); const sortedTabs = Tabs.getDynamicView('sorted_tabs') || Tabs.addDynamicView('sorted_tabs'); sortedTabs.applySimpleSort('position', false);

        const refreshMenu = () => {
            clearTimeout(global._refreshMenuFromTabsTimer);

            global._refreshMenuFromTabsTimer = setTimeout(() => {
                windowsLog.debug('Refresh menu with tabs');
                global.webviews = sortedTabs.data();
                appMenu(global.webviews);
                store.dispatch({ type: '[MAIN]:MENU:REFRESH' });
            }, 1000);
        };

        Tabs.on('insert', refreshMenu);
        Tabs.on('update', refreshMenu);
        Tabs.on('delete', refreshMenu);
    }
}