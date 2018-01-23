import Settings  from '../../settings';
import logger from '../../utils/logger';
import swarmNode from '../../swarmNode';
import { NodeState } from '../constants';
const swarmLog = logger.create('swarm');

export function runSwarm() {
    return (dispatch, getState) => {
        if (Settings.enableSwarmOnStart) {
            dispatch(toggleSwarm);
        }
    }
}

export function toggleSwarm() {
    return (dispatch, getState) => {
        if ([NodeState.Enabled, NodeState.Enabling].includes(getState().swarm.nodeState)) {
            dispatch({ type: '[SWARM]:NODE:STOP' });

            try {
                swarmNode.on('stopping', () => {
                    swarmLog.info('Stopping Swarm');
                    dispatch({ type: '[SWARM]:NODE:DISABLING' });
                });

                swarmNode.on('stopped', () => {
                    swarmLog.info('Swarm stopped');
                    dispatch({ type: '[SWARM]:NODE:DISABLED' });
                    dispatch(resetMenu());
                });

                swarmNode.stop();

                if (getState().swarm.enableOnStart) {
                    Settings.enableSwarmOnStart = false;
                    dispatch({ type: '[SWARM]:SETTINGS:DISABLE_ON_START' });
                }

            } catch (error) {
                dispatch({ type: '[SWARM]:NODE:ERROR', error });
                swarmLog.error(error);
            }

        } else {
            dispatch({ type: '[SWARM]:NODE:START' });

            try {
                swarmNode.on('starting', () => {
                    swarmLog.info('Starting Swarm');
                    dispatch({ type: '[SWARM]:NODE:ENABLING' });
                });

                swarmNode.on('downloadProgress', (progress) => {
                    swarmLog.info(`Downloading Swarm binary: ${(progress * 100).toFixed(1)}%`);
                });

                swarmNode.on('started', () => {
                    swarmLog.info('Swarm started');
                    dispatch({ type: '[SWARM]:NODE:ENABLED' });
                    dispatch(resetMenu());
                });

                swarmNode.init();

                if (!getState().swarm.enableOnStart) {
                    Settings.enableSwarmOnStart = true;
                    dispatch({ type: '[SWARM]:SETTINGS:ENABLE_ON_START' });
                }

            } catch (error) {
                dispatch({ type: '[SWARM]:NODE:ERROR', error });
                swarmLog.error(error);
            }
        }
    }
}

export function setSwarmEnableOnStart() {
    return { type: '[SWARM]:SETTINGS:ENABLE_ON_START' };
}