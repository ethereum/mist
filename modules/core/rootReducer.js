import { combineReducers } from 'redux';
import nodes from './nodes/reducer';
import settings from './settings/reducer';
import ui from './ui/reducer';

export default combineReducers({
  nodes,
  settings,
  ui
});
