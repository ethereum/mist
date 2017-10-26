import { assert } from 'chai';
import reducer, { initialState } from '../../../../modules/core/ui/reducer';

describe('the ui reducer', () => {
    it('should return a default initial state', () => {
        assert.deepEqual(reducer(undefined, {}), initialState);
    });

    it('should handle the "[MAIN]:WINDOW:CREATE_FINISH" action', () => {
        const action = {
            type: '[MAIN]:WINDOW:CREATE_FINISH',
            payload: { type: 'about' }
        };
        const expectedState = Object.assign({}, initialState, {
            aboutWindowCreated: true,
        });

        assert.deepEqual(reducer(initialState, action), expectedState);
    });

    it('should handle the "[MAIN]:APP_QUIT:SUCCESS" action', () => {
        const action = { type: '[MAIN]:APP_QUIT:SUCCESS' };
        const expectedState = Object.assign({}, initialState, {
            appQuit: true
        });

        assert.deepEqual(reducer(initialState, action), expectedState);
    });
});
