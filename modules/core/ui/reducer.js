const initialState = {
    appQuit: false,
    mainWindowCreated: false,
    mainWindowVisible: false,
    onboardingWindowCreated: false,
    onboardingWindowVisible: false,
    splashWindowCreated: false,
    splashWindowVisible: false,
    windowsInit: false,
};

const ui = (state = initialState, action) => {
    switch (action.type) {
        case 'APP::QUIT':
            return Object.assign({}, state, { appQuit: true });
        case 'MAIN_WINDOW::CLOSE':
            return Object.assign({}, state, { mainWindowVisible: false });
        case 'MAIN_WINDOW::CREATE_SUCCESS':
            return Object.assign({}, state, { mainWindowCreated: true });
        case 'MAIN_WINDOW::SHOW':
            return Object.assign({}, state, { mainWindowVisible: true });
        case 'MAIN_WINDOW::HIDE':
            return Object.assign({}, state, { mainWindowVisible: false });
        case 'ONBOARDING_WINDOW::CLOSE':
            return Object.assign({}, state, { onboardingWindowVisible: false });
        case 'ONBOARDING_WINDOW::CREATE_SUCCESS':
            return Object.assign({}, state, { onboardingWindowCreated: true, onboardingWindowVisible: true });
        case 'SPLASH_WINDOW::CLOSE':
            return Object.assign({}, state, { splashWindowVisible: false });
        case 'SPLASH_WINDOW::CREATE_SUCCESS':
            return Object.assign({}, state, { splashWindowCreated: true });
        case 'SPLASH_WINDOW::SHOW':
            return Object.assign({}, state, { splashWindowVisible: true });
        case 'SPLASH_WINDOW::HIDE':
            return Object.assign({}, state, { splashWindowVisible: false });
        case 'WINDOWS::INIT_FINISH':
            return Object.assign({}, state, { windowsInit: true });
        default:
            return state;
    }
}

export default ui;
