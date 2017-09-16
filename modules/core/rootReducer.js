import { combineReducers } from 'redux';
import settings from './settings/reducer';
import ui from './ui/reducer';

export default combineReducers({
    settings,
    ui,
});
