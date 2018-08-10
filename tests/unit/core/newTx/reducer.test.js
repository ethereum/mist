import { assert } from 'chai';
import reducer, { initialState } from '../../../../modules/core/newTx/reducer';

describe('the newTx reducer', () => {
  it('should return a default initial state', () => {
    assert.deepEqual(reducer(undefined, {}), initialState);
  });

  it('should handle the "[CLIENT]:NEW_TX:START" action', () => {
    const action = {
      type: '[CLIENT]:NEW_TX:START',
      payload: {
        from: 1,
        gasPrice: 1,
        gas: 1,
        data: 1,
        to: 1
      }
    };
    const expectedState = Object.assign({}, initialState, {
      from: 1,
      gasPrice: 1,
      gas: 1,
      data: 1,
      to: 1
    });

    assert.deepEqual(reducer(initialState, action), expectedState);
  });
});
