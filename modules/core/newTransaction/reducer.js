export const initialState = {
  from: '',
  gasPrice: '',
  gas: '',
  data: '',
  to: ''
};

const newTransaction = (state = initialState, action) => {
  switch (action.type) {
    case '[CLIENT]:NEW_TRANSACTION:START':
      return Object.assign({}, initialState, action.payload);
    default:
      return state;
  }
};

export default newTransaction;
