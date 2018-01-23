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
        const { active, local, remote } = store.getState().nodes;
        // if geth is behind infura by 50 or more blocks, active node is infura

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
    });

    return store;
}
