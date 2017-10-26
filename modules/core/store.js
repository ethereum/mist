import { createStore, applyMiddleware } from 'redux';
import { electronEnhancer } from 'redux-electron-store';
import { composeWithDevTools } from 'remote-redux-devtools';
import thunk from 'redux-thunk';
import { app } from 'electron';
import rootReducer from './rootReducer';

export default function configureReduxStore() {
    return createStore(
        rootReducer, 
        composeWithDevTools(applyMiddleware(thunk), electronEnhancer({
            dispatchProxy: a => store.dispatch(a)
        }))
    );
}
