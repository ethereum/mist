exports.getLanguage = function getLanguage() {
  return function(dispatch) {
    dispatch({ type: '[CLIENT]:GET_LANGUAGE:START' });
    try {
      const lang = ipc.sendSync('backendAction_getLanguage');
      i18n.changeLanguage(lang);
      TAPi18n.setLanguage(lang);
      dispatch({
        type: '[CLIENT]:GET_LANGUAGE:SUCCESS',
        payload: { i18n: lang }
      });
    } catch (error) {
      dispatch({ type: '[CLIENT]:GET_LANGUAGE:FAILURE', error });
    }
  };
};
