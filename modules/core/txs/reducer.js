export const initialState = [];

// tx object shape:
// { from, to, gas, gasPrice, nonce, data, value, networkId }

const txs = (state = initialState, action) => {
  switch (action.type) {
    case '[CLIENT]:NEW_TX:SENT':
      return [action.payload, ...state];
    default:
      return state;
  }
};

export default txs;
