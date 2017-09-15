const initialState = {
    appQuit: false,
    splashWindowCreated: false,
    splashWindowVisible: false,
    uiMode: '',
};

const ui = (state = initialState, action) => {
    switch (action.type) {
        case 'SPLASH_WINDOW::CREATE':
            return Object.assign({}, state, {
                created: true,
                uiMode: action.payload.uiMode
            });
        case 'SPLASH_WINDOW::SHOW':
            return Object.assign({}, state, {
                splashWindowVisible: true 
            });
        case 'SPLASH_WINDOW::HIDE':
            return Object.assign({}, state, {
                splashWindowVisible: true 
            });
        case 'APP::QUIT':
            return Object.assign({}, state, {
                appQuit: true
            });
        default:
            return state;
    }
}

export default ui;
