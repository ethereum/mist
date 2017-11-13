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

    it('should handle the "[MAIN]:WINDOW:OPEN" action', () => {
        const state = Object.assign({}, initialState, {
            windowsOpen: ['about']
        });
        const action = {
            type: '[MAIN]:WINDOW:OPEN',
            payload: { windowType: 'onboarding' },
        };
        const expectedState = Object.assign({}, state, {
            windowsOpen: ['about', 'onboarding']
        });

        assert.deepEqual(reducer(state, action), expectedState);
    });

    it('should handle the "[MAIN]:WINDOW:CLOSE" action', () => {
        const state = Object.assign({}, initialState, {
            windowsOpen: ['about', 'onboarding']
        });
        const action = {
            type: '[MAIN]:WINDOW:CLOSE',
            payload: { windowType: 'onboarding' },
        };
        const expectedState = Object.assign({}, state, {
            windowsOpen: ['about']
        });

        assert.deepEqual(reducer(state, action), expectedState);
    });

    it('should handle the "[MAIN]:GENERIC_WINDOW:REUSE" action', () => {
        const action = {
            type: '[MAIN]:GENERIC_WINDOW:REUSE',
            payload: { actingType: 'about' },
        };
        const expectedState = Object.assign({}, initialState, {
            genericWindowActingType: 'about'
        });

        assert.deepEqual(reducer(initialState, action), expectedState);
    });

    it('should handle the "[MAIN]:GENERIC_WINDOW:RESET" action', () => {
        const state = Object.assign({}, initialState, {
            genericWindowActingType: 'about',
        });
        const action = { type: '[MAIN]:GENERIC_WINDOW:RESET' };

        assert.deepEqual(reducer(state, action), initialState);
    });
});
