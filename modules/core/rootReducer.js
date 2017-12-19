import { combineReducers } from 'redux';
import settings from './settings/reducer';
import ui from './ui/reducer';
import ethereumNode from './ethereum_node/reducer';
import swarm from './swarm/reducer';
import ipfs from './swarm/reducer';

export default combineReducers({
    settings,
    ui,
    ethereumNode,
    swarm,
    ipfs
});
