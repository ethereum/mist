import { createStore, applyMiddleware } from 'redux';
import { forwardToRenderer, replayActionMain } from 'electron-redux';
import { composeWithDevTools } from 'remote-redux-devtools';
import thunk from 'redux-thunk';
import { app } from 'electron';
import rootReducer from './rootReducer';

export default function configureReduxStore() {
  // In development, send Redux actions to a local DevTools server
  // Note: run and view these DevTools with `yarn dev:tools`
  let debugWrapper = data => data;
  if (process.env.NODE_ENV === 'development') {
    debugWrapper = composeWithDevTools({ realtime: true, port: 8000 });
  }

  const store = createStore(
    rootReducer,
    debugWrapper(applyMiddleware(thunk, forwardToRenderer))
  );

  replayActionMain(store);

  return store;
}
