export const initialState = {
    connectedToInfura: false,
    usingLocalNode: false,
}

const nodes = (state = initialState, action) => {
    switch (action.type) {
        case '[MAIN]:LOCAL_NODE:CONNECTED':
            return Object.assign({}, state, { usingLocalNode: true });
        case '[MAIN]:INFURA_NODE:CONNECT':
            return Object.assign({}, state, { connectedToInfura: true });
        default:
            return state;
    }
}
export default nodes;
