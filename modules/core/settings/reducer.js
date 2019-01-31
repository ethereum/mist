export const SwarmState = {
  Enabled: 'Enabled',
  Enabling: 'Enabling',
  Disabling: 'Disabling',
  Disabled: 'Disabled',
  Error: 'Error'
};

export const initialState = {
  appVersion: '',
  autoTestMode: false,
  dbInit: false,
  dbSync: false,
  ignoreGpuBlacklist: false,
  i18n: '',
  ipcProviderBackendInit: false,
  productionMode: null,
  protocols: [],
  rpcMode: '',
  swarmState: SwarmState.Disabled,
  swarmEnableOnStart: false,
  uiMode: '',
  updateCheckerRan: false,
  cliFlags: {},
  etherPriceUSD: 0
};

const settings = (state = initialState, action) => {
  switch (action.type) {
    case '[MAIN]:DB:INIT':
      return Object.assign({}, state, { dbInit: true });
    case '[MAIN]:DB:SYNC_TO_BACKEND':
      return Object.assign({}, state, { dbSync: true });
    case '[MAIN]:PROTOCOL:REGISTER':
      return Object.assign({}, state, {
        protocols: state.protocols.concat(action.payload.protocol)
      });
    case '[MAIN]:BUILD_CONFIG:SYNC':
      const key = Object.keys(action.payload)[0];
      return Object.assign({}, state, { [key]: action.payload[key] });
    case '[MAIN]:IGNORE_GPU_BLACKLIST:SET':
      return Object.assign({}, state, { ignoreGpuBlacklist: true });
    case '[MAIN]:TEST_MODE:SET':
      return Object.assign({}, state, { autoTestMode: true });
    case '[MAIN]:CLI_FLAGS:SYNC':
      return Object.assign({}, state, { cliFlags: action.payload.cliFlags });
    case '[MAIN]:SET_LANGUAGE_ON_MAIN:SUCCESS':
      return Object.assign({}, state, { i18n: action.payload.i18n });
    case '[MAIN]:SWARM:ENABLING':
      return Object.assign({}, state, { swarmState: SwarmState.Enabling });
    case '[MAIN]:SWARM:ENABLED':
      return Object.assign({}, state, { swarmState: SwarmState.Enabled });
    case '[MAIN]:SWARM:DISABLING':
      return Object.assign({}, state, { swarmState: SwarmState.Disabling });
    case '[MAIN]:SWARM:DISABLED':
      return Object.assign({}, state, { swarmState: SwarmState.Disabled });
    case '[MAIN]:SWARM:FAILURE':
      return Object.assign({}, state, { swarmState: SwarmState.Error });
    case '[MAIN]:SWARM:ENABLE_ON_START':
      return Object.assign({}, state, { swarmEnableOnStart: true });
    case '[MAIN]:SWARM:DISABLE_ON_START':
      return Object.assign({}, state, { swarmEnableOnStart: false });
    case '[MAIN]:UPDATE_CHECKER:FINISH':
      return Object.assign({}, state, { updateCheckerRan: true });
    case '[MAIN]:IPC_PROVIDER_BACKEND:FINISH':
      return Object.assign({}, state, { ipcProviderBackendInit: true });
    case '[CLIENT]:GET_PRICE_CONVERSION:START':
      return Object.assign({}, state, {
        etherPriceUSD: 0
      });
    case '[CLIENT]:GET_PRICE_CONVERSION:SUCCESS':
      return Object.assign({}, state, {
        etherPriceUSD: action.payload.etherPriceUSD
      });
    case '[CLIENT]:GET_PRICE_CONVERSION:FAILURE':
      return Object.assign({}, state, {
        etherPriceUSD: 0
      });
    default:
      return state;
  }
};

export default settings;
