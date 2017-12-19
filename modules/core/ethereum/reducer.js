export const NodeState = {
    Enabled: 'Enabled',
    Enabling: 'Enabling',
    Disabling: 'Disabling',
    Disabled: 'Disabled',
    Error: 'Error'
}

export const initialState = {
    state: NodeState.Disabled,
    rpc: null
};

const ethereum = (state = initialState, action) => {
    switch (action.type) {
        case '[ETHEREUM_NODE]:INIT':
            return Object.assign({}, state, {
                state: NodeState.Enabling,
                rpc: action.payload.rpc
            });
    }
};