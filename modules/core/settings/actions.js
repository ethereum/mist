export function getLanguage(event) {
    return (dispatch, getState) => {
        dispatch({ type: '[MAIN]:GET_LANGUAGE:START' });
        try {
            const i18n = getState().settings.i18n;
            event.returnValue = i18n;
            dispatch({ type: '[MAIN]:GET_LANGUAGE:SUCCESS', payload: { i18n } });
        } catch (error) {
            dispatch({ type: '[MAIN]:GET_LANGUAGE:FAILURE', error });
        }
    }
}
