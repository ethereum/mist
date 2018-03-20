import { assert } from 'chai';
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { initialState } from '../../../../modules/core/settings/reducer';
import {
  getLanguage,
  resetMenu,
  setAcceptLanguageHeader,
  setLanguage,
  setLanguageOnClient,
  setLanguageOnMain,
  syncBuildConfig,
  syncFlags
} from '../../../../modules/core/settings/actions';

describe('settings actions:', () => {
  describe('synchronous action creators', () => {
    it('should handle #syncFlags', () => {
      const argv = { mode: 'mist', rpcMode: 'ipc', productionMode: true };
      const action = {
        type: '[MAIN]:CLI_FLAGS:SYNC',
        payload: { cliFlags: argv }
      };

      assert.deepEqual(syncFlags(argv), action);
    });

    it('should handle #syncBuildConfig', () => {
      const appVersion = '1.0.0';
      const action = {
        type: '[MAIN]:BUILD_CONFIG:SYNC',
        payload: { appVersion }
      };

      assert.deepEqual(syncBuildConfig('appVersion', appVersion), action);
    });
  });

  describe('asynchronous action creators', () => {
    const middlewares = [thunk];
    const initMockStore = configureMockStore(middlewares);
    const store = initMockStore({ settings: initialState });

    afterEach(() => store.clearActions());

    it('should handle #setLanguage', async () => {
      await store.dispatch(setLanguage('en', {}));
      const actions = store.getActions();

      assert.equal(actions.length, 10);
      assert.equal(actions[0].type, '[MAIN]:SET_LANGUAGE:START');
      assert.equal(actions.slice(-1)[0].type, '[MAIN]:SET_LANGUAGE:FINISH');
    });

    it('should handle #setLanguageOnMain', async () => {
      await store.dispatch(setLanguageOnMain('en'));
      const actions = store.getActions();

      assert.equal(actions.length, 2);
      assert.equal(actions[0].type, '[MAIN]:SET_LANGUAGE_ON_MAIN:START');
    });

    it('should handle #setLanguageOnClient', async () => {
      await store.dispatch(setLanguageOnClient('en', {}));
      const actions = store.getActions();

      assert.equal(actions.length, 2);
      assert.equal(actions[0].type, '[MAIN]:SET_LANGUAGE_ON_CLIENT:START');
    });

    it('should handle #setAcceptLanguageHeader', async () => {
      await store.dispatch(setAcceptLanguageHeader('en', {}));
      const actions = store.getActions();

      assert.equal(actions.length, 2);
      assert.equal(actions[0].type, '[MAIN]:SET_ACCEPT_LANGUAGE_HEADER:START');
    });

    it('should handle #resetMenu', async () => {
      await store.dispatch(resetMenu('en'));
      const actions = store.getActions();

      assert.equal(actions.length, 2);
      assert.equal(actions[0].type, '[MAIN]:RESET_MENU:START');
    });

    it('should handle #getLanguage', async () => {
      await store.dispatch(getLanguage({}));
      const actions = store.getActions();

      assert.equal(actions.length, 2);
      assert.equal(actions[0].type, '[MAIN]:GET_LANGUAGE:START');
    });
  });
});
