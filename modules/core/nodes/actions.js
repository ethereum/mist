import ethereumNodeRemote from '../../ethereumNodeRemote';

export function changeNetwork(network) {
    ethereumNodeRemote.setNetwork(network);
    return { type: '[MAIN]:NODES:CHANGE_NETWORK', payload: { network } };
}
