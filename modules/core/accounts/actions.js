import { ipcMain } from 'electron';
import Settings from '../../settings';
import logger from '../../utils/logger';
import ethereumNode from '../../ethereumNode';
import ipcProviderBackend from '../../ipc/ipcProviderBackend';
import { NodeType, NodeNetwork, NodeSyncMode } from './reducer';
import { NodeState } from '../constants';
import ClientBinaryManager from '../../clientBinaryManager';
import { InfuraEndpoints } from '../constants';
import Windows from '../../windows';

const accountsLog = logger.create('accounts');

export function syncAccounts() {
    return (dispatch, getState) => {
        const accounts = Settings.accounts;
        dispatch({ type: '[ETHEREUM]:ACOUNTS:SYNC', accounts });
    }
};

export function handleOnboarding() {
    return async (dispatch, getState) => {
        dispatch(syncAccounts());

        if (getState().accounts.active.length > 0) {
            dispatch({ type: '[ETHEREUM]:ONBOARDING:SKIP' });
            return;
        }

        // dispatch({ type: '[ETHEREUM]:ONBOARDING:START' });

        // const onboardingWindow = Windows.createPopup('onboardingScreen');
        // onboardingWindow.on('closed', () => store.dispatch(quitApp()));

        // ipcMain.on('onBoarding_launchApp', () => {
        //     onboardingWindow.removeAllListeners('closed');
        //     onboardingWindow.close();

        //     ipcMain.removeAllListeners('onBoarding_launchApp');

        //     dispatch({ type: '[ETHEREUM]:ONBOARDING:FINISHED' });
        // });
    }
};