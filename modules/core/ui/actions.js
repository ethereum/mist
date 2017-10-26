import { app } from 'electron';

export function quitApp() {
    return dispatch => {
        dispatch({ type: '[MAIN]:APP_QUIT:START' });
        try {
            app.quit();
            dispatch({ type: '[MAIN]:APP_QUIT:SUCCESS' });
        } catch (error) {
            dispatch({ type: '[MAIN]:APP_QUIT:FAILURE', error });
        }
    }
}
