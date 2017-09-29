export const initialState = {
    appVersion: '',
    autoTestMode: false,
    dbInit: false,
    dbSync: false,
    dirname: '',
    ignoreGpuBlacklist: false,
    i18n: '',
    ipcProviderBackendInit: false,
    mining: false,
    productionMode: null,
    protocols: [],
    rpcMode: '',
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
        case '[MAIN]:BUILD_CONFIG:SYNC':
            return Object.assign({}, state, { 
                appVersion: action.payload.appVersion,
                rpcMode: action.payload.rpcMode,
                productionMode: action.payload.productionMode
            });
        case '[MAIN]:IGNORE_GPU_BLACKLIST:SET':
            return Object.assign({}, state, { ignoreGpuBlacklist: true });
        case '[MAIN]:TEST_MODE:SET':
            return Object.assign({}, state, { autoTestMode: true });
        case 'SETTINGS_MINING::SET':
            return Object.assign({}, state, { mining: action.payload.mining });
        case 'SETTINGS_UI_MODE::SET':
            return Object.assign({}, state, { uiMode: action.payload.uiMode });
        case 'SETTINGS_DIRNAME::SET':
            return Object.assign({}, state, { dirname: action.payload.dirname });
        case '[MAIN]:CLI_FLAGS:SYNC':
            return Object.assign({}, state, { cliFlags: action.payload.cliFlags });
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
