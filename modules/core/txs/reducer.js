export const initialState = [];

// newTx object is prepared at end of
// confirmTx() in interface/actions.js

const txs = (state = initialState, action) => {
  switch (action.type) {
    case '[CLIENT]:NEW_TX:SENT':
      return [action.payload, ...state];
    default:
      return state;
  }
};

export default txs;
