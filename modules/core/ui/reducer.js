import uniq from 'lodash/uniq';

export const initialState = {
  appQuit: false,
  genericWindowActingType: '',
  windowsInit: false,
  windowsOpen: []
};

const ui = (state = initialState, action) => {
  switch (action.type) {
    case '[MAIN]:APP_QUIT:SUCCESS':
      return Object.assign({}, state, { appQuit: true });
    case '[MAIN]:WINDOW:OPEN':
      return Object.assign({}, state, {
        windowsOpen: uniq(state.windowsOpen.concat(action.payload.windowType))
      });
    case '[MAIN]:WINDOW:CLOSE':
      return Object.assign({}, state, {
        windowsOpen: state.windowsOpen.filter(w => {
          return w !== action.payload.windowType;
        })
      });
    case '[MAIN]:WINDOWS:INIT_FINISH':
      return Object.assign({}, state, { windowsInit: true });
    case '[MAIN]:GENERIC_WINDOW:REUSE':
      return Object.assign({}, state, {
        genericWindowActingType: action.payload.actingType,
        windowsOpen: state.windowsOpen.concat('generic')
      });
    case '[MAIN]:GENERIC_WINDOW:RESET':
      return Object.assign({}, state, {
        genericWindowActingType: '',
        windowsOpen: state.windowsOpen.filter(i => i !== 'generic')
      });
    default:
      return state;
  }
};

export default ui;
