import { assert } from 'chai';
import reducer, {
  initialState
} from '../../../../modules/core/newTransaction/reducer';

describe('the newTransaction reducer', () => {
  it('should return a default initial state', () => {
    assert.deepEqual(reducer(undefined, {}), initialState);
  });

  it('should handle the "[CLIENT]:NEW_TRANSACTION:START" action', () => {
    const action = {
      type: '[CLIENT]:NEW_TRANSACTION:START',
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
