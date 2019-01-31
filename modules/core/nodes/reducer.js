export const initialState = {
  active: 'remote',
  network: 'main',
  changingNetwork: false,
  remote: {
    client: 'infura',
    blockNumber: 100,
    timestamp: 0
  },
  local: {
    client: 'geth',
    blockNumber: 0,
    timestamp: 0,
    peerCount: 0,
    syncMode: 'fast',
    sync: {
      currentBlock: 0,
      highestBlock: 0,
      knownStates: 0,
      pulledStates: 0,
      startingBlock: 0
    }
  }
};

const nodes = (state = initialState, action) => {
  switch (action.type) {
    case '[MAIN]:LOCAL_NODE:SYNC_UPDATE':
      return Object.assign({}, state, {
        local: Object.assign({}, state.local, {
          sync: Object.assign({}, state.local.sync, {
            currentBlock: action.payload.currentBlock,
            highestBlock: action.payload.highestBlock,
            knownStates: action.payload.knownStates,
            pulledStates: action.payload.pulledStates,
            startingBlock: action.payload.startingBlock
          })
        })
      });
    case '[MAIN]:LOCAL_NODE:UPDATE_NEW_BLOCK':
      return Object.assign({}, state, {
        local: Object.assign({}, state.local, {
          blockNumber: action.payload.blockNumber,
          timestamp: action.payload.timestamp
        })
      });
    case '[MAIN]:LOCAL_NODE:RESET':
      return Object.assign({}, state, {
        local: Object.assign({}, state.local, {
          blockNumber: 0,
          timestamp: 0,
          peerCount: 0,
          sync: {
            currentBlock: 0,
            highestBlock: 0,
            knownStates: 0,
            pulledStates: 0,
            startingBlock: 0
          }
        })
      });
    case '[MAIN]:REMOTE_NODE:RESET':
      return Object.assign({}, state, {
        remote: Object.assign({}, state.remote, {
          blockNumber: 100,
          timestamp: 0
        })
      });
    case '[MAIN]:REMOTE_NODE:BLOCK_HEADER_RECEIVED':
      return Object.assign({}, state, {
        remote: Object.assign({}, state.remote, {
          blockNumber: action.payload.blockNumber,
          timestamp: action.payload.timestamp
        })
      });
    case '[MAIN]:NODES:CHANGE_ACTIVE':
      return Object.assign({}, state, {
        active: action.payload.active
      });
    case '[MAIN]:NODES:CHANGE_NETWORK_START':
      return Object.assign({}, state, {
        changingNetwork: true
      });
    case '[MAIN]:NODES:CHANGE_NETWORK_SUCCESS':
      return Object.assign({}, state, {
        changingNetwork: false,
        network: action.payload.network,
        remote: Object.assign({}, state.remote, {
          blockNumber: 100,
          timestamp: 0
        }),
        local: Object.assign({}, state.local, {
          blockNumber: 0,
          timestamp: 0,
          peerCount: 0,
          sync: {
            currentBlock: 0,
            highestBlock: 0,
            knownStates: 0,
            pulledStates: 0,
            startingBlock: 0
          }
        })
      });
    case '[MAIN]:NODES:CHANGE_SYNC_MODE':
      return Object.assign({}, state, {
        local: Object.assign({}, state.local, {
          syncMode: action.payload.syncMode
        })
      });
    case '[CLIENT]:NODES:UPDATE_LOCAL_PEER_COUNT':
      return Object.assign({}, state, {
        local: Object.assign({}, state.local, {
          peerCount: action.payload.peerCount
        })
      });
    default:
      return state;
  }
};

export default nodes;
