import Settings from '../../settings';
import ethereumNodeRemote from '../../ethereumNodeRemote';

export function syncNodeDefaults() {
    return dispatch => {
        const network = Settings.network || Settings.loadUserData('network') || 'main';
        const syncMode = Settings.syncmode || Settings.loadUserData('syncmode') || 'fast';
        dispatch({ type: '[MAIN]:NODES:CHANGE_NETWORK', payload: { network } });
        dispatch({ type: '[MAIN]:NODES:CHANGE_SYNC_MODE', payload: { syncMode } });
    }
}

export function changeNetwork(network) {
    ethereumNodeRemote.setNetwork(network);
    return { type: '[MAIN]:NODES:CHANGE_NETWORK', payload: { network } };
}

export function changeSyncMode(syncMode) {
    return { type: '[MAIN]:NODES:CHANGE_SYNC_MODE', payload: { syncMode } };
}

export function syncLocalNode(payload) {
    return {
        type: '[MAIN]:LOCAL_NODE:SYNC_UPDATE',
        payload: {
            currentBlock: parseInt(payload.currentBlock, 16),
            highestBlock: parseInt(payload.highestBlock, 16),
            knownStates: parseInt(payload.knownStates, 16),
            pulledStates: parseInt(payload.pulledStates, 16),
            startingBlock: parseInt(payload.startingBlock, 16),
        }
    };
}

export function resetLocalNode() {
    return { type: '[MAIN]:LOCAL_NODE:RESET' };
}

export function resetRemoteNode() {
    return { type: '[MAIN]:REMOTE_NODE:RESET' };
}

