export const initialState = {
  from: '',
  gasPriceGweiStandard: 0,
  gasPriceGweiPriority: 0,
  gas: '',
  gasLoading: false,
  data: '',
  executionFunction: '',
  params: [],
  to: '',
  toIsContract: false,
  isNewContract: false,
  unlocking: false,
  estimatedGas: 3000000,
  gasError: '',
  priority: false,
  token: {
    name: '',
    symbol: '',
    address: '',
    decimals: 18
  }
};

const newTx = (state = initialState, action) => {
  switch (action.type) {
    case '[CLIENT]:NEW_TX:START':
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
    case '[CLIENT]:CONFIRM_TX:START':
      return Object.assign({}, state, { unlocking: true });
    case '[CLIENT]:CONFIRM_TX:SUCCESS':
      return Object.assign({}, state, { unlocking: false });
    case '[CLIENT]:CONFIRM_TX:FAILURE':
      return Object.assign({}, state, { unlocking: false });
    case '[CLIENT]:PRIORITY:TOGGLE':
      return Object.assign({}, state, { priority: !state.priority });
    case '[CLIENT]:GET_GAS_PRICE:START':
      return Object.assign({}, state, {
        gasLoading: true
      });
    case '[CLIENT]:GET_GAS_PRICE:SUCCESS':
      return Object.assign({}, state, {
        gasPriceGweiStandard: action.payload.gasPriceGweiStandard,
        gasPriceGweiPriority: action.payload.gasPriceGweiPriority
      });
    case '[CLIENT]:GET_GAS_PRICE:FAILURE':
      return Object.assign({}, state, {
        gasLoading: false
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
        gasError: action.error,
        gasLoading: false
      });
    case '[CLIENT]:ESTIMATE_GAS_USAGE:OVER_BLOCK_LIMIT':
      return Object.assign({}, state, {
        estimatedGas: action.error.estimatedGas,
        gasError: action.error.message,
        gasLoading: false
      });
    case '[CLIENT]:CALCULATE_GAS:SUCCESS':
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
    case '[CLIENT]:GET_TOKEN_DETAILS:SUCCESS':
      return Object.assign({}, state, {
        token: action.payload.token
      });
    default:
      return state;
  }
};

export default newTx;
