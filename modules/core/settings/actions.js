const Settings = require('../../settings');
const timesync = require('os-timesync');
const { dialog } = require('electron');

import clientBinaryManager from '../../clientBinaryManager';
import UpdateChecker from '../..//updateChecker';

import logger from '../../utils/logger';
const settingsLog = logger.create('Settings');

export function syncFlags(argv) {
    return { type: '[MAIN]:CLI_FLAGS:SYNC', payload: { cliFlags: argv } };
}

export function syncBuildConfig(key, value) {
    return { 
        type: '[MAIN]:BUILD_CONFIG:SYNC', 
        payload: { [key]: value }
    };
}

export function setLanguage(lang, browserWindow) {
    return dispatch => {
        dispatch({ type: '[MAIN]:SET_LANGUAGE:START' });
        dispatch(setLanguageOnMain(lang));
        dispatch(setLanguageOnClient(lang, browserWindow));
        dispatch(setAcceptLanguageHeader(lang, browserWindow));
        dispatch(resetMenu(lang));
        dispatch({ type: '[MAIN]:SET_LANGUAGE:FINISH' });
    }
}

export function setLanguageOnMain(lang) {
    return dispatch => {
        dispatch({ type: '[MAIN]:SET_LANGUAGE_ON_MAIN:START' });
        try {
            i18n.changeLanguage(lang.substr(0, 5));
            dispatch({ type: '[MAIN]:SET_LANGUAGE_ON_MAIN:SUCCESS', payload: { i18n: lang } });
        } catch (error) {
            dispatch({ type: '[MAIN]:SET_LANGUAGE_ON_MAIN:FAILURE', error });
        }
    }
}

export function setLanguageOnClient(lang, browserWindow) {
    return dispatch => {
        dispatch({ type: '[MAIN]:SET_LANGUAGE_ON_CLIENT:START' });
        try {
            browserWindow.webContents.executeJavaScript(
               `TAPi18n.setLanguage("${lang}");`
            );
            dispatch({ type: '[MAIN]:SET_LANGUAGE_ON_CLIENT:SUCCESS', payload: { i18n: lang } });
        } catch (error) {
            dispatch({ type: '[MAIN]:SET_LANGUAGE_ON_CLIENT:FAILURE', error });
        }
    }
}

export function setAcceptLanguageHeader(lang, browserWindow) {
    return dispatch => {
        dispatch({ type: '[MAIN]:SET_ACCEPT_LANGUAGE_HEADER:START' });
        try {
            const session = browserWindow.webContents.session;
            session.setUserAgent(session.getUserAgent(), lang);
            dispatch({ type: '[MAIN]:SET_ACCEPT_LANGUAGE_HEADER:SUCCESS' });
        } catch (error) {
            dispatch({ type: '[MAIN]:SET_ACCEPT_LANGUAGE_HEADER:FAILURE', error });
        }
    }
}

export function resetMenu(lang) {
    return dispatch => {
        dispatch({ type: '[MAIN]:RESET_MENU:START' });
        try {
            if (lang) {
                Settings.language = lang;
            }

            const appMenu = require('../../menuItems');
            appMenu(global.webviews);

            dispatch({ type: '[MAIN]:RESET_MENU:SUCCESS' });
        } catch (error) {
            dispatch({ type: '[MAIN]:RESET_MENU:FAILURE', error });
        }
    }
}

export function getLanguage(event) {
    return (dispatch, getState) => {
        dispatch({ type: '[MAIN]:GET_LANGUAGE:START' });
        try {
            const i18n = getState().settings.i18n;
            event.returnValue = i18n;
            dispatch({ type: '[MAIN]:GET_LANGUAGE:SUCCESS', payload: { i18n } });
        } catch (error) {
            dispatch({ type: '[MAIN]:GET_LANGUAGE:FAILURE', error });
        }
    }
}

export function runClientBinaryManager() {
    clientBinaryManager.init();
    return { type: '[MAIN]:CLIENT_BINARY_MANAGER:RUN' };
}

export function runUpdateChecker() {
    if (!Settings.inAutoTestMode) {
        UpdateChecker.run();
        return { type: '[MAIN]:UPDATE_CHECKER:START' };
    }
}

export function checkTimeSync() {
    if (Settings.skiptimesynccheck) {
        return { type: '[MAIN]:TIME_SYNC:SKIP' };
    }

    return (dispatch, getState) => {
        timesync.checkEnabled((error, enabled) => {
            if (error) {
                settingsLog.error('Couldn\'t infer if computer automatically syncs time.', error);
                dispatch({type: '[MAIN]:TIME_SYNC:ERROR', error });
            }

            if (!enabled) {
                dialog.showMessageBox({
                    type: 'warning',
                    buttons: ['OK'],
                    message: global.i18n.t('mist.errors.timeSync.title'),
                    detail: `${global.i18n.t('mist.errors.timeSync.description')}\n\n${global.i18n.t(`mist.errors.timeSync.${process.platform}`)}`,
                }, () => {
                });
            }

            dispatch({ type: '[MAIN]:TIME_SYNC:COMPLETE', enabled });
        });
    }

}

