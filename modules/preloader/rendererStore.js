// Create the client-side Redux store.
// This store's only purpose is to sync with the main store.
const { createStore, applyMiddleware } = require('redux');
const {
    forwardToMain,
    getInitialStateRenderer,
    replayActionRenderer,
} = require('electron-redux');
const thunk = require('redux-thunk').default;
const initialState = getInitialStateRenderer();

const store = createStore(
    () => {},
    initialState,
    applyMiddleware(forwardToMain, thunk),
);

replayActionRenderer(store);

module.exports = store;
