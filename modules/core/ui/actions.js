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
  };
}

export function openWindow(windowType) {
  return { type: '[MAIN]:WINDOW:OPEN', payload: { windowType } };
}

export function closeWindow(windowType) {
  return { type: '[MAIN]:WINDOW:CLOSE', payload: { windowType } };
}

export function reuseGenericWindow(actingType) {
  return { type: '[MAIN]:GENERIC_WINDOW:REUSE', payload: { actingType } };
}

export function resetGenericWindow() {
  return { type: '[MAIN]:GENERIC_WINDOW:RESET' };
}
