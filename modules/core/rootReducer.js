import { combineReducers } from 'redux';
import newTx from './newTx/reducer';
import txs from './txs/reducer';
import nodes from './nodes/reducer';
import settings from './settings/reducer';
import ui from './ui/reducer';

export default combineReducers({
  newTx,
  txs,
  nodes,
  settings,
  ui
});
