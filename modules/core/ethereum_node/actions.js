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

const ethereumNodeLog = logger.create('etherumNode');

export function connectRemote() {
    return async (dispatch, getState) => {
        const currentProviderAddress = InfuraEndpoints.ethereum.websockets[getState().ethereumNode.network];
        dispatch({ type: '[ETHEREUM]:NODE:CONNECTED', currentProviderAddress });
    }
}

export function startEthereumNode() {
    return (dispatch, getState) => {
        dispatch(connectRemote());
        return;

        dispatch({ type: '[ETHEREUM]:NODE:ENABLING' });

        let args = [];

        switch (getState().ethereumNode.type) {
          case NodeType.Geth:
              args.push([
                  '-ws', // Enable WebSockets
                  '--syncmode', `--${getState().ethereumNode.syncMode.toLowerCase()}`,
                  '--keystore', Settings.keystorePath
              ]);

              switch (getState().ethereumNode.network) {
                  case NodeNetwork.Rinkeby:
                      args.push('--rinkeby');
                  case NodeNetwork.Ropsten:
                      args.push('--ropsten');
                  case NodeNetwork.Kovan:
                      const error = "Kovan is not currently available in Geth."
                      ethereumNodeLog.error(error);
                      throw Error(error);
              }
          }

          const customNodeOptions = Settings.nodeOptions;
          if (customNodeOptions) {
            ethereumNodeLog.debug('Custom node options', customNodeOptions);
            args.push(customNodeOptions);
          }

          const binPath = getBinPath(getState().ethereumNode.type);

          ethereumNodeLog.trace('Spawn node', binPath, args);
          dispatch({ type: '[ETHEREUM]:NODE:SPAWN', process });

          const process = spawn(binPath, args);

          process.stdout.on('data', (data) => {
              const dataString = data.toString();
              ethereumNodeLog.info(dataString);

              switch (getState().ethereumNode.type) {
                  case NodeType.Geth:
                      if (dataString.includes('WebSocket endpoint opened')) {
                        const webSocketAddress = dataString.match(/ws:\/\/.*/)[0];
                        dispatch({ type: '[ETHEREUM]:NODE:ENABLED', webSocketAddress });
                      }
              }
          });

          process.stderr.on('data', (data) => {
              const dataString = data.toString();
              ethereumNodeLog.error(dataString);
          });
    }
}

function getBinPath(nodeType) {
  const client = ClientBinaryManager.getClient(nodeType);

  if (!client || !client.binPath) {
    const error = `Node "${nodeType}" binPath is not available.`;
    ethereumNodeLog.error(error);
    throw new Error(error);
  }

  switch (NodeType) {
    case NodeType.Geth: 
      return client.binPath;
  }
}

export function stopNode(nodeOptions = {}) {
    return async (dispatch, getState) => {
      // Disconnect

      // Disable 
    }
}

export function startEthereumNode2(nodeOptions = {}) {
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