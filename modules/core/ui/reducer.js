export const initialState = {
    aboutWindowCreated: false,
    appQuit: false,
    clientUpdateAvailableWindowCreated: false,
    connectAccountWindowCreated: false,
    importAccountWindowCreated: false,
    loadingWindowCreated: false,
    mainWindowCreated: false,
    mainWindowVisible: false,
    onboardingScreenWindowCreated: false,
    onboardingScreenWindowVisible: false,
    remixWindowCreated: false,
    requestAccountWindowCreated: false,
    sendTransactionConfirmationWindowCreated: false,
    splashWindowCreated: false,
    splashWindowVisible: false,
    updateAvailableWindowCreated: false,
    windowsInit: false,
};

const ui = (state = initialState, action) => {
    switch (action.type) {
        case '[MAIN]:APP_QUIT:SUCCESS':
            return Object.assign({}, state, { appQuit: true });
        case 'MAIN_WINDOW::CLOSE':
            return Object.assign({}, state, { mainWindowVisible: false });
        case '[MAIN]:WINDOW:CREATE_FINISH':
            return Object.assign({}, state, { [`${action.payload.type}WindowCreated`]: true });
        case 'MAIN_WINDOW::SHOW':
            return Object.assign({}, state, { mainWindowVisible: true });
        case 'MAIN_WINDOW::HIDE':
            return Object.assign({}, state, { mainWindowVisible: false });
        case 'ONBOARDING_WINDOW::CLOSE':
            return Object.assign({}, state, { onboardingScreenWindowVisible: false });
        case 'SPLASH_WINDOW::CLOSE':
            return Object.assign({}, state, { splashWindowVisible: false });
        case 'SPLASH_WINDOW::SHOW':
            return Object.assign({}, state, { splashWindowVisible: true });
        case 'SPLASH_WINDOW::HIDE':
            return Object.assign({}, state, { splashWindowVisible: false });
        case '[MAIN]:WINDOWS:INIT_FINISH':
            return Object.assign({}, state, { windowsInit: true });
        default:
            return state;
    }
}

export default ui;
