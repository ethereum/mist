// Create the client-side Redux store.
// This store's only purpose is to sync with the main store.
const { createStore, applyMiddleware } = require('redux');
const {
  forwardToMain,
  getInitialStateRenderer,
  replayActionRenderer
} = require('electron-redux');
const thunk = require('redux-thunk').default;
const initialState = getInitialStateRenderer();
import { persistStore, persistReducer } from 'redux-persist';
import rootReducer from '../core/rootReducer';

// No persistence required for auxiliary stores.
// This config is to stub out the functionality.
const persistConfig = {
  key: 'root',
  storage: {},
  whitelist: []
};
const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = createStore(
  persistedReducer,
  initialState,
  applyMiddleware(forwardToMain, thunk)
);

replayActionRenderer(store);

module.exports = store;
