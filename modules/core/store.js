import { createStore, applyMiddleware } from 'redux';
import { forwardToRenderer, replayActionMain } from 'electron-redux';
import { composeWithDevTools } from 'remote-redux-devtools';
import thunk from 'redux-thunk';
import { app } from 'electron';
import rootReducer from './rootReducer';
import { persistStore, persistReducer } from 'redux-persist';
import createElectronStorage from 'redux-persist-electron-storage';

const storage = createElectronStorage({
  electronStoreOpts: {
    encryptionKey: 'secret encryption key'
  }
});

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['txs']
};

// In development, send Redux actions to a local DevTools server
// Note: run and view these DevTools with `yarn dev:tools`
let debugWrapper = data => data;
if (process.env.NODE_ENV === 'development') {
  debugWrapper = composeWithDevTools({
    realtime: true,
    port: 8000,
    maxAge: 100
  });
}

const persistedReducer = persistReducer(persistConfig, rootReducer);

export default function configureReduxStore() {
  const store = createStore(
    persistedReducer,
    debugWrapper(applyMiddleware(thunk, forwardToRenderer))
  );
  persistStore(store);
  replayActionMain(store);
  return store;
}
