import { assert } from 'chai';
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { initialState } from '../../../../modules/core/ui/reducer';
import { quitApp } from '../../../../modules/core/ui/actions';

describe('ui actions:', () => {
  describe('asynchronous action creators', () => {
    const middlewares = [thunk];
    const initMockStore = configureMockStore(middlewares);
    const store = initMockStore({ ui: initialState });

    afterEach(() => store.clearActions());

    it('should handle #quitApp', async () => {
      await store.dispatch(quitApp());
      const actions = store.getActions();

      assert.equal(actions.length, 2);
      assert.equal(actions[0].type, '[MAIN]:APP_QUIT:START');
    });
  });
});
