export const initialState = [];

// tx object shape:
// { from, to, gas, gasPrice, nonce, data, value }

const txs = (state = initialState, action) => {
  switch (action.type) {
    case '[CLIENT]:NEW_TX:SENT':
      return [...state, action.payload];
    default:
      return state;
  }
};

export default txs;
