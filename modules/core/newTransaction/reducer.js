export const initialState = {
  from: '',
  gasPrice: '',
  gas: '',
  data: '',
  to: '',
  toIsContract: false,
  isNewContract: false
  // destinationType: 'address', 'contract', 'new' ?
};

const newTransaction = (state = initialState, action) => {
  switch (action.type) {
    case '[CLIENT]:NEW_TRANSACTION:START':
      return Object.assign({}, initialState, action.payload);
    case '[CLIENT]:DETERMINE_IF_CONTRACT:SUCCESS':
      return Object.assign({}, state, {
        toIsContract: action.payload.toIsContract,
        isNewContract: action.payload.isNewContract
      });
    default:
      return state;
  }
};

export default newTransaction;
