import { assert } from 'chai';
import reducer, { initialState } from '../../../../modules/core/ui/reducer';

describe('the ui reducer', () => {
  it('should return a default initial state', () => {
    assert.deepEqual(reducer(undefined, {}), initialState);
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
      payload: { windowType: 'importAccount' }
    };
    const expectedState = Object.assign({}, state, {
      windowsOpen: ['about', 'importAccount']
    });

    assert.deepEqual(reducer(state, action), expectedState);
  });

  it('should handle the "[MAIN]:WINDOW:CLOSE" action', () => {
    const state = Object.assign({}, initialState, {
      windowsOpen: ['about', 'importAccount']
    });
    const action = {
      type: '[MAIN]:WINDOW:CLOSE',
      payload: { windowType: 'importAccount' }
    };
    const expectedState = Object.assign({}, state, {
      windowsOpen: ['about']
    });

    assert.deepEqual(reducer(state, action), expectedState);
  });

  it('should handle the "[MAIN]:GENERIC_WINDOW:REUSE" action', () => {
    const action = {
      type: '[MAIN]:GENERIC_WINDOW:REUSE',
      payload: { actingType: 'about' }
    };
    const expectedState = Object.assign({}, initialState, {
      genericWindowActingType: 'about',
      windowsOpen: ['generic']
    });

    assert.deepEqual(reducer(initialState, action), expectedState);
  });

  it('should handle the "[MAIN]:GENERIC_WINDOW:RESET" action', () => {
    const state = Object.assign({}, initialState, {
      genericWindowActingType: 'about',
      windowsOpen: ['generic', 'main']
    });
    const action = { type: '[MAIN]:GENERIC_WINDOW:RESET' };
    const expectedState = Object.assign({}, initialState, {
      windowsOpen: ['main']
    });

    assert.deepEqual(reducer(state, action), expectedState);
  });
});
