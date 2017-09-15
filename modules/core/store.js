import { createStore } from 'redux';
import { app } from 'electron';
import devToolsEnhancer from 'remote-redux-devtools';
import rootReducer from './rootReducer';

export default async function configureReduxStore() {
    const store = createStore(rootReducer, devToolsEnhancer());

    store.subscribe(() => {
        const state = store.getState();

        if (state.ui.appQuit) return app.quit();
    });

    return store;
}
