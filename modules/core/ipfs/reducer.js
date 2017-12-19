import NodeState from '../ethereum_node/reducer';

export const initialState = {
    nodeState: NodeState.Disabled,
    enableOnStart: false
};

const ipfs = (state = initialState, action) => {
    switch (action.type) {
        default:
            return state;
    }
}

export default ipfs;