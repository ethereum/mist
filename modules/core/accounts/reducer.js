export const initialState = {
    active: []
};

const accounts = (state = initialState, action) => {
    switch (action.type) {
        case '[ETHEREUM]:ACCOUNTS:SYNC':
            return Object.assign({}, state, {
                active: action.accounts
            });
        case '[ETHEREUM]:ACCOUNTS:NEW':
            return Object.assign({}, state, {
                active: [...state.active, action.wallet]
            });
        default:
            return state;
    }
};

export default accounts;
