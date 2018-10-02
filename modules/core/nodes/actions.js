import ethereumNodeRemote from '../../ethereumNodeRemote';
import { InfuraEndpoints } from '../../constants';

export function changeNetwork(network) {
  return dispatch => {
    dispatch({ type: '[MAIN]:NODES:CHANGE_NETWORK_START' });

    try {
      ethereumNodeRemote.setNetwork(network);
      dispatch({
        type: '[MAIN]:NODES:CHANGE_NETWORK_SUCCESS',
        payload: { network }
      });
    } catch (e) {
      dispatch({ type: '[MAIN]:NODES:CHANGE_NETWORK_FAILURE', error: e });
    }
  };
}

export function changeSyncMode(syncMode) {
  return { type: '[MAIN]:NODES:CHANGE_SYNC_MODE', payload: { syncMode } };
}

export function updateLocalBlock(blockNumber, timestamp) {
  return (dispatch, getState) => {
    if (blockNumber === 0) {
      return;
    }

    if (getState().nodes.local.blockNumber === blockNumber) {
      return;
    }

    dispatch({
      type: '[MAIN]:LOCAL_NODE:UPDATE_NEW_BLOCK',
      payload: { blockNumber, timestamp }
    });
  };
}

export function syncLocalNode(sync) {
  return (dispatch, getState) => {
    if (sync === true || sync === false) {
      return;
    }

    const thisCurrentBlock = parseInt(sync.currentBlock, 16);
    const thisKnownStates = parseInt(sync.knownStates, 16);
    const localCurrentBlock = getState().nodes.local.sync.currentBlock;
    const localKnownStates = getState().nodes.local.sync.knownStates;

    if (
      thisCurrentBlock > localCurrentBlock ||
      thisKnownStates > localKnownStates
    ) {
      dispatch({
        type: '[MAIN]:LOCAL_NODE:SYNC_UPDATE',
        payload: {
          currentBlock: parseInt(sync.currentBlock, 16),
          highestBlock: parseInt(sync.highestBlock, 16),
          knownStates: parseInt(sync.knownStates, 16),
          pulledStates: parseInt(sync.pulledStates, 16),
          startingBlock: parseInt(sync.startingBlock, 16)
        }
      });
    }
  };
}

export function remoteBlockReceived(block) {
  const { number, timestamp } = block;
  return {
    type: '[MAIN]:REMOTE_NODE:BLOCK_HEADER_RECEIVED',
    payload: {
      blockNumber: parseInt(number, 16),
      timestamp: parseInt(timestamp, 16)
    }
  };
}

export function resetLocalNode() {
  return { type: '[MAIN]:LOCAL_NODE:RESET' };
}

export function resetRemoteNode() {
  return { type: '[MAIN]:REMOTE_NODE:RESET' };
}

export function setActiveNode() {
  return (dispatch, getState) => {
    // Ensure remote is active if local node is 15 or more blocks behind remote or local node has no peers.
    const { active, network, local, remote } = getState().nodes;

    // If nosync, ensure active is 'remote'
    if (local.syncMode === 'nosync') {
      if (active === 'local') {
        dispatch({
          type: '[MAIN]:NODES:CHANGE_ACTIVE',
          payload: { active: 'remote' }
        });
      }
      return;
    }

    const supportedRemoteNetworks = Object.keys(
      InfuraEndpoints.ethereum.websockets
    ).map(network => network.toLowerCase());

    if (supportedRemoteNetworks.indexOf(network) === -1) {
      // If unsupported network, ensure active is 'local'
      if (active === 'remote') {
        dispatch({
          type: '[MAIN]:NODES:CHANGE_ACTIVE',
          payload: { active: 'local' }
        });
      }
      return;
    }

    if (active === 'remote') {
      if (remote.blockNumber - local.blockNumber < 15 && local.peerCount > 0) {
        dispatch({
          type: '[MAIN]:NODES:CHANGE_ACTIVE',
          payload: { active: 'local' }
        });
      }
    } else {
      if (remote.blockNumber - local.blockNumber >= 15) {
        dispatch({
          type: '[MAIN]:NODES:CHANGE_ACTIVE',
          payload: { active: 'remote' }
        });
      }
    }
  };
}
