const initialState = {
    appVersion: '',
    autoTestMode: false,
    dbInit: false,
    dbSync: false,
    dirname: '',
    gpuBlacklist: false,
    i18n: '',
    ipcProviderBackendInit: false,
    mining: false,
    productionMode: null,
    protocols: [],
    rpcMode: '',
    settingsInit: false,
    swarmInit: false,
    uiMode: '',
    updateCheckerRan: false,
    cliFlags: {}
};

const settings = (state = initialState, action) => {
    switch (action.type) {
        case 'DB::INIT':
            return Object.assign({}, state, { dbInit: true });
        case 'DB::SYNC_TO_BACKEND':
            return Object.assign({}, state, { dbSync: true });
        case 'PROTOCOL::REGISTER':
            return Object.assign({}, state, { 
                protocols: state.protocols.concat(action.payload.protocol)
            });
        case 'SETTINGS::INIT_FINISH':
            return Object.assign({}, state, { settingsInit: true });
        case 'SETTINGS_APP_VERSION::SET':
            return Object.assign({}, state, { appVersion: action.payload.appVersion });
        case 'SETTINGS_GPU_BLACKLIST::SET':
            return Object.assign({}, state, { gpuBlacklist: true });
        case 'SETTINGS_AUTO_TEST_MODE::SET':
            return Object.assign({}, state, { autoTestMode: true });
        case 'SETTINGS_PRODUCTION_MODE::SET':
            return Object.assign({}, state, { productionMode: action.payload.productionMode });
        case 'SETTINGS_RPC_MODE::SET':
            return Object.assign({}, state, { rpcMode: action.payload.rpcMode });
        case 'SETTINGS_MINING::SET':
            return Object.assign({}, state, { mining: action.payload.mining });
        case 'SETTINGS_UI_MODE::SET':
            return Object.assign({}, state, { uiMode: action.payload.uiMode });
        case 'SETTINGS_DIRNAME::SET':
            return Object.assign({}, state, { dirname: action.payload.dirname });
        case '[MAIN]:CLI_FLAGS:SYNC':
            return Object.assign({}, state, { cliFlags: action.payload.flags });
        case '[MAIN]:SET_LANGUAGE_ON_MAIN:SUCCESS':
            return Object.assign({}, state, { i18n: action.payload.i18n });
        case 'SWARM::INIT_FINISH':
            return Object.assign({}, state, { swarmInit: true });
        case 'UPDATE_CHECKER::FINISH':
            return Object.assign({}, state, { updateCheckerRan: true });
        case 'IPC_PROVIDER_BACKEND::FINISH':
            return Object.assign({}, state, { ipcProviderBackendInit: true });
        default:
            return state;
    }
}

export default settings;
