const _ = require('../../utils/underscore.js');

export const initialState = [];

// newTx object is prepared at end of
// confirmTx() in interface/actions.js

const txs = (state = initialState, action) => {
  switch (action.type) {
    case '[CLIENT]:NEW_TX:SENT':
      const { newTx } = action.payload;
      return [newTx, ...state];
    case '[CLIENT]:TX:UPDATE': {
      const { tx } = action.payload;
      const theTx = _.findWhere(state, { hash: tx.hash });
      const txIndex = _.indexOf(state, theTx);
      const newState = [...state];
      newState[txIndex] = Object.assign(theTx, tx);
      return newState;
    }
    default:
      return state;
  }
};

export default txs;
