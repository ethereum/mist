import Settings from '../../settings';
import { InfuraEndpoints } from '../constants';

export function runIPFS() {
    return (dispatch, getState) => {
        if (Settings.enableIPFSOnStart) {
            dispatch(toggleIPFS);
        }
    }
}

export function toggleIPFS() {
    return (dispatch, getState) => {
        if ([NodeState.Enabled, NodeState.Enabling].includes(getState().ipfs.nodeState)) {
            dispatch({ type: '[IPFS]:NODE:DISABLED' });

            if (getState().ipfs.enableOnStart) {
                Settings.enableIPFSOnStart = false;
                dispatch({ type: '[IPFS]:SETTINGS:DISABLE_ON_START' });
            }

        } else {
            const gateway = InfuraEdnpoints.ipfs.gateway;
            const rpc = InfuraEdnpoints.ipfs.rpc;
            dispatch({ type: '[IPFS]:NODE:CONNECTED', gateway, rpc });

            if (!getState().ipfs.enableOnStart) {
                Settings.enableIPFSOnStart = true;
                dispatch({ type: '[IPFS]:SETTINGS:ENABLE_ON_START' });
            }
        }
    };
};

export function setIPFSEnableOnStart() {
    return { type: '[IPFS]:SETTINGS:ENABLE_ON_START' };
}