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

    store.subscribe(() => {
        checkActiveNode(store.getState());
    });

    return store;
}

function checkActiveNode(state) {
    // If local node is 50 or more blocks behind remote, ensure remote is active.
    // Otherwise, local should be active.
    const { active, local, remote } = state.nodes;

    if (active === 'remote') {
        if ((remote.blockNumber - local.currentBlock) < 50) {
            store.dispatch({
                type: '[MAIN]:NODES:CHANGE_ACTIVE',
                payload: { active: 'local' },
            });
        }
    } else {
        if ((remote.blockNumber - local.currentBlock) >= 50) {
            store.dispatch({
                type: '[MAIN]:NODES:CHANGE_ACTIVE',
                payload: { active: 'remote' },
            });
        }
    }
}