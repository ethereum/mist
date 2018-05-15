import { combineReducers } from 'redux';
import newTransaction from './newTransaction/reducer';
import nodes from './nodes/reducer';
import settings from './settings/reducer';
import ui from './ui/reducer';

export default combineReducers({
  newTransaction,
  nodes,
  settings,
  ui
});
