import { assert } from 'chai';
import reducer, {
  initialState
} from '../../../../modules/core/settings/reducer';

describe('the settings reducer', () => {
  it('should return a default initial state', () => {
    assert.deepEqual(reducer(undefined, {}), initialState);
  });

  it('should handle the "[MAIN]:BUILD_CONFIG:SYNC" action', () => {
    const action = {
      type: '[MAIN]:BUILD_CONFIG:SYNC',
      payload: { appVersion: '1.0.0' }
    };
    const expectedState = Object.assign({}, initialState, {
      appVersion: '1.0.0'
    });

    assert.deepEqual(reducer(initialState, action), expectedState);
  });

  it('should handle the "[MAIN]:IGNORE_GPU_BLACKLIST:SET" action', () => {
    const action = { type: '[MAIN]:IGNORE_GPU_BLACKLIST:SET' };
    const expectedState = Object.assign({}, initialState, {
      ignoreGpuBlacklist: true
    });

    assert.deepEqual(reducer(initialState, action), expectedState);
  });

  it('should handle the "[MAIN]:CLI_FLAGS:SYNC" action', () => {
    const action = {
      type: '[MAIN]:CLI_FLAGS:SYNC',
      payload: {
        cliFlags: {
          mode: 'mist',
          syncmode: 'light',
          swarmurl: 'http://localhost:8585'
        }
      }
    };
    const expectedState = Object.assign({}, initialState, {
      cliFlags: {
        mode: 'mist',
        syncmode: 'light',
        swarmurl: 'http://localhost:8585'
      }
    });

    assert.deepEqual(reducer(initialState, action), expectedState);
  });

  it('should handle the "[MAIN]:SET_LANGUAGE_ON_MAIN:SUCCESS" action', () => {
    const action = {
      type: '[MAIN]:SET_LANGUAGE_ON_MAIN:SUCCESS',
      payload: { i18n: 'de' }
    };
    const expectedState = Object.assign({}, initialState, {
      i18n: 'de'
    });

    assert.deepEqual(reducer(initialState, action), expectedState);
  });

  it('should handle the "[CLIENT:GET_PRICE_CONVERSION:START]" action', () => {
    const action = { type: '[CLIENT]:GET_PRICE_CONVERSION:START' };
    const oldState = Object.assign({}, initialState, {
      etherPriceUSD: 500
    });
    const expectedState = Object.assign({}, initialState, {
      etherPriceUSD: 0
    });
    assert.deepEqual(reducer(oldState, action), expectedState);
  });

  it('should handle the "[CLIENT:GET_PRICE_CONVERSION:SUCCESS]" action', () => {
    const action = {
      type: '[CLIENT]:GET_PRICE_CONVERSION:SUCCESS',
      payload: { etherPriceUSD: 500 }
    };
    const oldState = Object.assign({}, initialState, {
      etherPriceUSD: 0
    });
    const expectedState = Object.assign({}, initialState, {
      etherPriceUSD: 500
    });
    assert.deepEqual(reducer(oldState, action), expectedState);
  });

  it('should handle the "[CLIENT:GET_PRICE_CONVERSION:FAILURE]" action', () => {
    const action = { type: '[CLIENT]:GET_PRICE_CONVERSION:FAILURE' };
    const oldState = Object.assign({}, initialState, {
      etherPriceUSD: 500
    });
    const expectedState = Object.assign({}, initialState, {
      etherPriceUSD: 0
    });
    assert.deepEqual(reducer(oldState, action), expectedState);
  });
});
