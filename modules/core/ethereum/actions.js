const Settings = require('../../settings');

import logger from '../../utils/logger';
import ethereumNode from '../../ethereumNode';
import ipcProviderBackend from '../../ipc/ipcProviderBackend';
import { NodeState } from './reducer';

const ethereumNodeLog = logger.create('etherumNode');

export function startEthereumNode(nodeOptions = {}) {
    return async (dispatch, getState) => {
      ipcProviderBackend.init();

      await ethereumNode.init();

      dispatch(handleNodeSync());

      if (!ethereumNode.isIpcConnected) {
        const error = 'Either the node didn\'t start or IPC socket failed to connect.'
        ethereumNodeLog.error(error)
        throw new Error(error);
      }

      ethereumNodeLog.info('Connected via IPC to node.');

      ethereumNode.on('nodeConnectionTimeout', () => {
        ethereumNodeLog.info('nodeConnectionTimeout')
        Windows.broadcast('uiAction_nodeStatus', 'connectionTimeout');
      });

      ethereumNode.on('nodeLog', (data) => {
        ethereumNodeLog.info('nodeLog', data.toString());
        Windows.broadcast('uiAction_nodeLogText', data.replace(/^.*[0-9]]/, ''));
      });

      ethereumNode.on('state', (state, stateAsText) => {
        ethereumNodeLog.info('state', stateAsText);

        Windows.broadcast('uiAction_nodeStatus', stateAsText,
          ethereumNode.STATES.ERROR === state ? ethereumNode.lastError : null
          );
      });

    return {
        type: '[ETHEREUM]:NODE:INIT',
        payload: {
          nodeOptions
        }
    };
  };
}

export function handleOnboarding() {
    return async (dispatch, getState) => {
        if (Settings.accounts) {
            dispatch({ type: '[ETHEREUM]:ONBOARDING:SKIP' });
            return;
        }

          // Try to fetch accounts from node.
          // If none, show the onboarding process.
          const ethAccounts = await ethereumNode.send('eth_accounts', []);

          if (ethAccounts.result.length > 0) {
              dispatch({ type: '[ETHEREUM]:ONBOARDING:SKIP' });
              return;
          }

          dispatch({ type: '[ETHEREUM]:ONBOARDING:START' });

        await new Promise((resolve, reject) => {
            const onboardingWindow = Windows.createPopup('onboardingScreen');
            onboardingWindow.on('closed', () => store.dispatch(quitApp()));

            ipcMain.on('onBoarding_launchApp', () => {
                onboardingWindow.removeAllListeners('closed');
                onboardingWindow.close();

                ipcMain.removeAllListeners('onBoarding_launchApp');

                dispatch({ type: '[ETHEREUM]:ONBOARDING:FINISHED' });
                resolve(true);
            });
        });
    }
};

export function handleNodeSync() {
  return (dispatch, getState) => {
    return new Q((resolve, reject) => {
        nodeSync.on('nodeSyncing', (result) => {
            Windows.broadcast('uiAction_nodeSyncStatus', 'inProgress', result);
        });

        nodeSync.on('stopped', () => {
            Windows.broadcast('uiAction_nodeSyncStatus', 'stopped');
        });

        nodeSync.on('error', (err) => {
            log.error('Error syncing node', err);

            reject(err);
        });

        nodeSync.on('finished', () => {
            nodeSync.removeAllListeners('error');
            nodeSync.removeAllListeners('finished');

            resolve();
        });
    });
}
};