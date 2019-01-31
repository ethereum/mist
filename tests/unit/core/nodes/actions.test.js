import { assert } from 'chai';
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { initialState } from '../../../../modules/core/nodes/reducer';
import {
  changeNetwork,
  changeSyncMode,
  remoteBlockReceived,
  resetLocalNode,
  resetRemoteNode
} from '../../../../modules/core/nodes/actions';

describe('nodes actions:', () => {
  describe('synchronous action creators', () => {
    it('should handle #changeSyncMode', () => {
      const action = {
        type: '[MAIN]:NODES:CHANGE_SYNC_MODE',
        payload: { syncMode: 'light' }
      };

      assert.deepEqual(changeSyncMode('light'), action);
    });

    it('should handle #resetLocalNode', () => {
      const action = { type: '[MAIN]:LOCAL_NODE:RESET' };

      assert.deepEqual(resetLocalNode(), action);
    });

    it('should handle #resetRemoteNode', () => {
      const action = { type: '[MAIN]:REMOTE_NODE:RESET' };

      assert.deepEqual(resetRemoteNode(), action);
    });

    it('should handle #remoteBlockReceived', () => {
      const block = { number: '0x21c723', timestamp: '0x5ae9d9b8' };
      const action = {
        type: '[MAIN]:REMOTE_NODE:BLOCK_HEADER_RECEIVED',
        payload: { blockNumber: 2213667, timestamp: 1525275064 }
      };

      assert.deepEqual(remoteBlockReceived(block), action);
    });
  });

  describe('asynchronous action creators', () => {
    const middlewares = [thunk];
    const initMockStore = configureMockStore(middlewares);
    const store = initMockStore({ settings: initialState });

    afterEach(() => store.clearActions());

    it('should handle #changeNetwork', async () => {
      await store.dispatch(changeNetwork('rinkeby'));
      const actions = store.getActions();

      assert.equal(actions.length, 2);
      assert.equal(actions[0].type, '[MAIN]:NODES:CHANGE_NETWORK_START');
    });
  });
});
