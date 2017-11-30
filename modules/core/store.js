import { createStore, applyMiddleware } from 'redux';
import { forwardToRenderer, replayActionMain } from 'electron-redux';
import { composeWithDevTools } from 'remote-redux-devtools';
import thunk from 'redux-thunk';
import { app } from 'electron';
import rootReducer from './rootReducer';

export default function configureReduxStore() {
    const store = createStore(
        rootReducer, 
        composeWithDevTools(applyMiddleware(thunk, forwardToRenderer)),
    );

    replayActionMain(store);

    return store;
}
