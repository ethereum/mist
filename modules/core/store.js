import { createStore, applyMiddleware } from 'redux';
import { app } from 'electron';
import { composeWithDevTools } from 'remote-redux-devtools';
import rootReducer from './rootReducer';
import thunk from 'redux-thunk';

export default function configureReduxStore() {
    const store = createStore(
        rootReducer, 
        composeWithDevTools(applyMiddleware(thunk))
    );

    store.subscribe(() => {
        const state = store.getState();

        if (state.ui.appQuit) return app.quit();
    });

    return store;
}
