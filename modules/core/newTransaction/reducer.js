export const initialState = {
  from: '',
  gasPrice: 0,
  gas: '',
  gasLoading: false,
  data: '',
  executionFunction: '',
  params: [],
  to: '',
  toIsContract: false,
  isNewContract: false,
  unlocking: false,
  estimatedGas: 3000000
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
    case '[CLIENT]:DETERMINE_IF_CONTRACT:FAILURE':
      return Object.assign({}, state, {
        toIsContract: false,
        isNewContract: false
      });
    case '[CLIENT]:CONFIRM_TRANSACTION:START':
      return Object.assign({}, state, { unlocking: true });
    case '[CLIENT]:CONFIRM_TRANSACTION:SUCCESS':
      return Object.assign({}, state, { unlocking: false });
    case '[CLIENT]:CONFIRM_TRANSACTION:FAILURE':
      return Object.assign({}, state, { unlocking: false });
    case '[CLIENT]:GET_PRICE_CONVERSION:START':
      return Object.assign({}, state, {
        priceUSD: 0
      });
    case '[CLIENT]:GET_PRICE_CONVERSION:SUCCESS':
      return Object.assign({}, state, {
        priceUSD: action.payload.priceUSD
      });
    case '[CLIENT]:GET_PRICE_CONVERSION:FAILURE':
      return Object.assign({}, state, {
        priceUSD: 0
      });
    case '[CLIENT]:GET_GAS_PRICE:SUCCESS':
      return Object.assign({}, state, {
        gasPrice: action.payload.gasPrice
      });
    case '[CLIENT]:ESTIMATE_GAS_USAGE:START':
      return Object.assign({}, state, {
        gasLoading: true
      });
    case '[CLIENT]:ESTIMATE_GAS_USAGE:SUCCESS':
      return Object.assign({}, state, {
        estimatedGas: action.payload.estimatedGas,
        gasLoading: false
      });
    case '[CLIENT]:ESTIMATE_GAS_USAGE:FAILURE':
      return Object.assign({}, state, {
        gasLoading: false
      });
    case '[CLIENT]:LOOKUP_SIGNATURE:SUCCESS':
      return Object.assign({}, state, {
        executionFunction: action.payload.executionFunction
      });
    case '[CLIENT]:DECODE_FUNCTION_SIGNATURE:SUCCESS':
      return Object.assign({}, state, {
        params: action.payload.params
      });
    default:
      return state;
  }
};

export default newTransaction;
