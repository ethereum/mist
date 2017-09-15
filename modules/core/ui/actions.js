export function createSplashWindow(uiMode) {
    return { type: 'SPLASH_WINDOW::CREATE', payload: { uiMode } };
}

export function quitApp() {
    return { type: 'APP::QUIT' };
}
