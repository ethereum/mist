import { assert } from 'chai';
import reducer, { initialState } from '../../../../modules/core/nodes/reducer';

describe('the nodes reducer', () => {
  const exampleState = {
    active: 'remote',
    network: 'kovan',
    remote: {
      client: 'infura',
      blockNumber: 800,
      timestamp: 800
    },
    local: {
      client: 'geth',
      blockNumber: 0,
      timestamp: 0,
      syncMode: 'fast',
      sync: {
        currentBlock: 400,
        highestBlock: 400,
        knownStates: 400,
        pulledStates: 400,
        startingBlock: 400
      }
    }
  };

  it('should return a default initial state', () => {
    assert.deepEqual(reducer(undefined, {}), initialState);
  });

  it('should handle the "[MAIN]:LOCAL_NODE:SYNC_UPDATE" action', () => {
    const action = {
      type: '[MAIN]:LOCAL_NODE:SYNC_UPDATE',
      payload: {
        currentBlock: 1,
        highestBlock: 1,
        knownStates: 1,
        pulledStates: 1,
        startingBlock: 1
      }
    };
    const expectedState = Object.assign({}, initialState, {
      local: Object.assign({}, initialState.local, {
        sync: Object.assign({}, initialState.local.sync, {
          currentBlock: 1,
          highestBlock: 1,
          knownStates: 1,
          pulledStates: 1,
          startingBlock: 1
        })
      })
    });

    assert.deepEqual(reducer(initialState, action), expectedState);
  });

  it('should handle the "[MAIN]:LOCAL_NODE:UPDATE_NEW_BLOCK" action', () => {
    const action = {
      type: '[MAIN]:LOCAL_NODE:UPDATE_NEW_BLOCK',
      payload: {
        blockNumber: 1,
        timestamp: 1
      }
    };
    const expectedState = Object.assign({}, initialState, {
      local: Object.assign({}, initialState.local, {
        blockNumber: 1,
        timestamp: 1
      })
    });

    assert.deepEqual(reducer(initialState, action), expectedState);
  });

  it('should handle the "[MAIN]:LOCAL_NODE:RESET" action', () => {
    const action = { type: '[MAIN]:LOCAL_NODE:RESET' };
    const expectedState = Object.assign({}, exampleState, {
      local: Object.assign({}, initialState.local)
    });

    assert.deepEqual(reducer(exampleState, action), expectedState);
  });

  it('should handle the "[MAIN]:REMOTE_NODE:RESET" action', () => {
    const action = { type: '[MAIN]:REMOTE_NODE:RESET' };
    const expectedState = Object.assign({}, exampleState, {
      remote: Object.assign({}, initialState.remote)
    });

    assert.deepEqual(reducer(exampleState, action), expectedState);
  });

  it('should handle the "[MAIN]:REMOTE_NODE:BLOCK_HEADER_RECEIVED" action', () => {
    const action = {
      type: '[MAIN]:REMOTE_NODE:BLOCK_HEADER_RECEIVED',
      payload: {
        blockNumber: 1,
        timestamp: 1
      }
    };
    const expectedState = Object.assign({}, initialState, {
      remote: Object.assign({}, initialState.remote, {
        blockNumber: 1,
        timestamp: 1
      })
    });

    assert.deepEqual(reducer(initialState, action), expectedState);
  });

  it('should handle the "[MAIN]:NODES:CHANGE_ACTIVE" action', () => {
    const action = {
      type: '[MAIN]:NODES:CHANGE_ACTIVE',
      payload: { active: 'local' }
    };
    const expectedState = Object.assign({}, initialState, {
      active: 'local'
    });

    assert.deepEqual(reducer(initialState, action), expectedState);
  });

  it('should handle the "[MAIN]:NODES:CHANGE_NETWORK_START" action', () => {
    const action = { type: '[MAIN]:NODES:CHANGE_NETWORK_START' };
    const expectedState = Object.assign({}, initialState, {
      changingNetwork: true
    });

    assert.deepEqual(reducer(initialState, action), expectedState);
  });

  it('should handle the "[MAIN]:NODES:CHANGE_NETWORK_SUCCESS" action', () => {
    const action = {
      type: '[MAIN]:NODES:CHANGE_NETWORK_SUCCESS',
      payload: { network: 'rinkeby' }
    };
    const expectedState = Object.assign({}, initialState, {
      network: 'rinkeby'
    });

    assert.deepEqual(reducer(exampleState, action), expectedState);
  });

  it('should handle the "[MAIN]:NODES:CHANGE_SYNC_MODE" action', () => {
    const action = {
      type: '[MAIN]:NODES:CHANGE_SYNC_MODE',
      payload: { syncMode: 'light' }
    };
    const expectedState = Object.assign({}, initialState, {
      local: Object.assign({}, initialState.local, {
        syncMode: 'light'
      })
    });

    assert.deepEqual(reducer(initialState, action), expectedState);
  });
});
