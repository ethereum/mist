const _ = require('./utils/underscore.js');
const fs = require('fs');
const Q = require('bluebird');
const spawn = require('child_process').spawn;
const { dialog } = require('electron');
const Windows = require('./windows.js');
const logRotate = require('log-rotate');
const path = require('path');
const EventEmitter = require('events').EventEmitter;
const Sockets = require('./socketManager');
const ClientBinaryManager = require('./clientBinaryManager');
import Settings from './settings';
import {
  syncLocalNode,
  resetLocalNode,
  updateLocalBlock
} from './core/nodes/actions';

import logger from './utils/logger';
const ethereumNodeLog = logger.create('EthereumNode');

const DEFAULT_NODE_TYPE = 'geth';
const DEFAULT_NETWORK = 'main';
const DEFAULT_SYNCMODE = 'light';

const UNABLE_TO_BIND_PORT_ERROR = 'unableToBindPort';
const NODE_START_WAIT_MS = 3000;

const STATES = {
  STARTING: 0 /* Node about to be started */,
  STARTED: 1 /* Node started */,
  CONNECTED: 2 /* IPC connected - all ready */,
  STOPPING: 3 /* Node about to be stopped */,
  STOPPED: 4 /* Node stopped */,
  ERROR: -1 /* Unexpected error */
};

let instance;

/**
 * Etheruem nodes manager.
 */
class EthereumNode extends EventEmitter {
  constructor() {
    super();

    if (!instance) {
      instance = this;
    }

    this.STATES = STATES;

    // Set default states
    this.state = STATES.STOPPED;
    this.isExternalNode = false;

    this._loadDefaults();

    this._node = null;
    this._type = null;
    this._network = null;

    this._socket = Sockets.get('node-ipc', Settings.rpcMode);

    this.on('data', _.bind(this._logNodeData, this));

    return instance;
  }

  get isOwnNode() {
    return !this.isExternalNode;
  }

  get isIpcConnected() {
    return this._socket.isConnected;
  }

  get type() {
    return this.isOwnNode ? this._type : null;
  }

  get network() {
    return this._network;
  }

  get syncMode() {
    return this._syncMode;
  }

  get isEth() {
    return this._type === 'eth';
  }

  get isGeth() {
    return this._type === 'geth';
  }

  get isMainNetwork() {
    return this.network === 'main';
  }

  get isTestNetwork() {
    return this.network === 'test' || this.network === 'ropsten';
  }

  get isRinkebyNetwork() {
    return this.network === 'rinkeby';
  }

  get isDevNetwork() {
    return this.network === 'dev';
  }

  get isLightMode() {
    return this._syncMode === 'light';
  }

  get state() {
    return this._state;
  }

  get stateAsText() {
    switch (this._state) {
      case STATES.STARTING:
        return 'starting';
      case STATES.STARTED:
        return 'started';
      case STATES.CONNECTED:
        return 'connected';
      case STATES.STOPPING:
        return 'stopping';
      case STATES.STOPPED:
        return 'stopped';
      case STATES.ERROR:
        return 'error';
      default:
        return false;
    }
  }

  set state(newState) {
    this._state = newState;

    this.emit('state', this.state, this.stateAsText);
  }

  get lastError() {
    return this._lastErr;
  }

  set lastError(err) {
    this._lastErr = err;
  }

  /**
   * This method should always be called first to initialise the connection.
   * @return {Promise}
   */
  init() {
    return this._socket
      .connect(Settings.rpcConnectConfig)
      .then(() => {
        this.isExternalNode = true;
        this.state = STATES.CONNECTED;
        store.dispatch({ type: '[MAIN]:LOCAL_NODE:CONNECTED' });
        this.emit('runningNodeFound');
        this.setNetwork();
        return null;
      })
      .catch(() => {
        this.isExternalNode = false;

        ethereumNodeLog.warn(
          'Failed to connect to an existing local node. Starting our own...'
        );

        ethereumNodeLog.info(`Node type: ${this.defaultNodeType}`);
        ethereumNodeLog.info(`Network: ${this.defaultNetwork}`);
        ethereumNodeLog.info(`SyncMode: ${this.defaultSyncMode}`);

        return this._start(
          this.defaultNodeType,
          this.defaultNetwork,
          this.defaultSyncMode
        ).catch(err => {
          ethereumNodeLog.error('Failed to start node', err);
          throw err;
        });
      });
  }

  restart(newType, newNetwork, syncMode) {
    return Q.try(() => {
      if (!this.isOwnNode) {
        throw new Error('Cannot restart node since it was started externally');
      }

      ethereumNodeLog.info('Restart node', newType, newNetwork);

      return this.stop()
        .then(() => Windows.loading.show())
        .then(async () => {
          await Sockets.destroyAll();
          this._socket = Sockets.get('node-ipc', Settings.rpcMode);
          return null;
        })
        .then(() =>
          this._start(
            newType || this.type,
            newNetwork || this.network,
            syncMode || this.syncMode
          )
        )
        .then(() => Windows.loading.hide())
        .catch(err => {
          ethereumNodeLog.error('Error restarting node', err);
          throw err;
        });
    });
  }

  /**
   * Stop node.
   *
   * @return {Promise}
   */
  stop() {
    if (!this._stopPromise) {
      return new Q(resolve => {
        if (!this._node) {
          return resolve();
        }

        clearInterval(this.syncInterval);
        clearInterval(this.watchlocalBlocksInterval);

        this.state = STATES.STOPPING;

        ethereumNodeLog.info(
          `Stopping existing node: ${this._type} ${this._network}`
        );

        this._node.stderr.removeAllListeners('data');
        this._node.stdout.removeAllListeners('data');
        this._node.stdin.removeAllListeners('error');
        this._node.removeAllListeners('error');
        this._node.removeAllListeners('exit');

        this._node.kill('SIGINT');

        // after some time just kill it if not already done so
        const killTimeout = setTimeout(() => {
          if (this._node) {
            this._node.kill('SIGKILL');
          }
        }, 8000 /* 8 seconds */);

        this._node.once('close', () => {
          clearTimeout(killTimeout);

          this._node = null;

          resolve();
        });
      })
        .then(() => {
          this.state = STATES.STOPPED;
          this._stopPromise = null;
        })
        .then(() => {
          // Reset block values in store
          store.dispatch(resetLocalNode());
        });
    }
    ethereumNodeLog.debug(
      'Disconnection already in progress, returning Promise.'
    );
    return this._stopPromise;
  }

  /**
   * Send Web3 command to socket.
   * @param  {String} method Method name
   * @param  {Array} [params] Method arguments
   * @return {Promise} resolves to result or error.
   */
  async send(method, params) {
    const ret = await this._socket.send({ method, params });
    return ret;
  }

  /**
   * Start an ethereum node.
   * @param  {String} nodeType geth, eth, etc
   * @param  {String} network  network id
   * @param  {String} syncMode full, fast, light, nosync
   * @return {Promise}
   */
  _start(nodeType, network, syncMode) {
    ethereumNodeLog.info(`Start node: ${nodeType} ${network} ${syncMode}`);

    if (network === 'test' || network === 'ropsten') {
      ethereumNodeLog.debug('Node will connect to the test network');
    }

    return this.stop()
      .then(() => {
        return this.__startNode(nodeType, network, syncMode).catch(err => {
          ethereumNodeLog.error('Failed to start node', err);

          this._showNodeErrorDialog(nodeType, network);

          throw err;
        });
      })
      .then(proc => {
        ethereumNodeLog.info(
          `Started node successfully: ${nodeType} ${network} ${syncMode}`
        );

        this._node = proc;
        this.state = STATES.STARTED;

        Settings.saveUserData('node', this._type);
        Settings.saveUserData('network', this._network);
        Settings.saveUserData('syncmode', this._syncMode);

        return this._socket
          .connect(
            Settings.rpcConnectConfig,
            {
              timeout: 30000 /* 30s */
            }
          )
          .then(() => {
            this.state = STATES.CONNECTED;
            this._checkSync();
          })
          .catch(err => {
            ethereumNodeLog.error('Failed to connect to node', err);

            if (err.toString().indexOf('timeout') >= 0) {
              this.emit('nodeConnectionTimeout');
            }

            this._showNodeErrorDialog(nodeType, network);

            throw err;
          });
      })
      .catch(err => {
        // set before updating state so that state change event observers
        // can pick up on this
        this.lastError = err.tag;
        this.state = STATES.ERROR;

        // if unable to start eth node then write geth to defaults
        if (nodeType === 'eth') {
          Settings.saveUserData('node', 'geth');
        }

        throw err;
      });
  }

  /**
   * @return {Promise}
   */
  __startNode(nodeType, network, syncMode) {
    this.state = STATES.STARTING;

    this._network = network;
    this._type = nodeType;
    this._syncMode = syncMode;

    store.dispatch({
      type: '[MAIN]:NODES:CHANGE_NETWORK_SUCCESS',
      payload: { network }
    });

    store.dispatch({
      type: '[MAIN]:NODES:CHANGE_SYNC_MODE',
      payload: { syncMode }
    });

    const client = ClientBinaryManager.getClient(nodeType);
    let binPath;

    if (client) {
      binPath = client.binPath;
    } else {
      throw new Error(`Node "${nodeType}" binPath is not available.`);
    }

    ethereumNodeLog.info(`Start node using ${binPath}`);

    return new Q((resolve, reject) => {
      this.__startProcess(nodeType, network, binPath, syncMode).then(
        resolve,
        reject
      );
    });
  }

  /**
   * @return {Promise}
   */
  __startProcess(nodeType, network, binPath, _syncMode) {
    let syncMode = _syncMode;
    if (nodeType === 'geth' && !syncMode) {
      syncMode = DEFAULT_SYNCMODE;
    }

    return new Q((resolve, reject) => {
      ethereumNodeLog.trace('Rotate log file');

      logRotate(
        path.join(Settings.userDataPath, 'logs', 'all.log'),
        { count: 5 },
        error => {
          if (error) {
            ethereumNodeLog.error('Log rotation problems', error);
            return reject(error);
          }
        }
      );

      logRotate(
        path.join(
          Settings.userDataPath,
          'logs',
          'category',
          'ethereum_node.log'
        ),
        { count: 5 },
        error => {
          if (error) {
            ethereumNodeLog.error('Log rotation problems', error);
            return reject(error);
          }
        }
      );

      let args;

      switch (network) {
        // Starts Ropsten network
        case 'ropsten':
        // fall through
        case 'test':
          args = [
            '--testnet',
            '--cache',
            process.arch === 'x64' ? '1024' : '512',
            '--ipcpath',
            Settings.rpcIpcPath
          ];
          if (syncMode === 'nosync') {
            args.push('--nodiscover', '--maxpeers=0');
          } else {
            args.push('--syncmode', syncMode);
          }
          break;

        // Starts Rinkeby network
        case 'rinkeby':
          args = [
            '--rinkeby',
            '--cache',
            process.arch === 'x64' ? '1024' : '512',
            '--ipcpath',
            Settings.rpcIpcPath
          ];
          if (syncMode === 'nosync') {
            args.push('--nodiscover', '--maxpeers=0');
          } else {
            args.push('--syncmode', syncMode);
          }
          break;

        // Starts local network
        case 'dev':
          args = [
            '--dev',
            '--minerthreads',
            '1',
            '--ipcpath',
            Settings.rpcIpcPath
          ];
          break;

        // Starts Main net
        default:
          args =
            nodeType === 'geth'
              ? ['--cache', process.arch === 'x64' ? '1024' : '512']
              : ['--unsafe-transactions'];
          if (nodeType === 'geth' && syncMode === 'nosync') {
            args.push('--nodiscover', '--maxpeers=0');
          } else {
            args.push('--syncmode', syncMode);
          }
      }

      const nodeOptions = Settings.nodeOptions;

      if (nodeOptions && nodeOptions.length) {
        ethereumNodeLog.debug('Custom node options', nodeOptions);

        args = args.concat(nodeOptions);
      }

      ethereumNodeLog.trace('Spawn', binPath, args);

      const proc = spawn(binPath, args);

      proc.once('error', error => {
        if (this.state === STATES.STARTING) {
          this.state = STATES.ERROR;

          ethereumNodeLog.info('Node startup error');

          // TODO: detect this properly
          // this.emit('nodeBinaryNotFound');

          reject(error);
        }
      });

      proc.stdout.on('data', data => {
        ethereumNodeLog.trace('Got stdout data', data.toString());
        this.emit('data', data);
      });

      proc.stderr.on('data', data => {
        ethereumNodeLog.trace('Got stderr data', data.toString());
        ethereumNodeLog.info(data.toString()); // TODO: This should be ethereumNodeLog.error(), but not sure why regular stdout data is coming in through stderror
        this.emit('data', data);
      });

      // when data is first received
      this.once('data', () => {
        /*
                    We wait a short while before marking startup as successful
                    because we may want to parse the initial node output for
                    errors, etc (see geth port-binding error above)
                */
        setTimeout(() => {
          if (STATES.STARTING === this.state) {
            ethereumNodeLog.info(
              `${NODE_START_WAIT_MS}ms elapsed, assuming node started up successfully`
            );
            resolve(proc);
          }
        }, NODE_START_WAIT_MS);
      });
    });
  }

  _showNodeErrorDialog(nodeType, network) {
    let log = path.join(Settings.userDataPath, 'logs', 'all.log');

    if (log) {
      log = `...${log.slice(-1000)}`;
    } else {
      log = global.i18n.t('mist.errors.nodeStartup');
    }

    // add node type
    log =
      `Node type: ${nodeType}\n` +
      `Network: ${network}\n` +
      `Platform: ${process.platform} (Architecture ${process.arch})\n\n${log}`;

    dialog.showMessageBox(
      {
        type: 'error',
        buttons: ['OK'],
        message: global.i18n.t('mist.errors.nodeConnect'),
        detail: log
      },
      () => {}
    );
  }

  _logNodeData(data) {
    const cleanData = data.toString().replace(/[\r\n]+/, '');
    const nodeType = (this.type || 'node').toUpperCase();

    ethereumNodeLog.trace(`${nodeType}: ${cleanData}`);

    if (!/^-*$/.test(cleanData) && !_.isEmpty(cleanData)) {
      this.emit('nodeLog', cleanData);
    }

    // check for geth startup errors
    if (STATES.STARTING === this.state) {
      const dataStr = data.toString().toLowerCase();
      if (nodeType === 'geth') {
        if (dataStr.indexOf('fatal: error') >= 0) {
          const error = new Error(`Geth error: ${dataStr}`);

          if (dataStr.indexOf('bind') >= 0) {
            error.tag = UNABLE_TO_BIND_PORT_ERROR;
          }

          ethereumNodeLog.error(error);
          return reject(error);
        }
      }
    }
  }

  _loadDefaults() {
    ethereumNodeLog.trace('Load defaults');

    this.defaultNodeType =
      Settings.nodeType || Settings.loadUserData('node') || DEFAULT_NODE_TYPE;
    this.defaultNetwork =
      Settings.network || Settings.loadUserData('network') || DEFAULT_NETWORK;
    this.defaultSyncMode =
      Settings.syncmode ||
      Settings.loadUserData('syncmode') ||
      DEFAULT_SYNCMODE;

    ethereumNodeLog.info(
      Settings.syncmode,
      Settings.loadUserData('syncmode'),
      DEFAULT_SYNCMODE
    );
    ethereumNodeLog.info(
      `Defaults loaded: ${this.defaultNodeType} ${this.defaultNetwork} ${
        this.defaultSyncMode
      }`
    );
    store.dispatch({
      type: '[MAIN]:NODES:CHANGE_NETWORK_SUCCESS',
      payload: { network: this.defaultNetwork }
    });
    store.dispatch({
      type: '[MAIN]:NODES:CHANGE_SYNC_MODE',
      payload: { syncMode: this.defaultSyncMode }
    });
  }

  _checkSync() {
    // Reset
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      const syncingResult = await this.send('eth_syncing');
      const sync = syncingResult.result;
      if (sync === false) {
        const blockNumberResult = await this.send('eth_blockNumber');
        const blockNumber = parseInt(blockNumberResult.result, 16);
        if (blockNumber >= store.getState().nodes.remote.blockNumber - 15) {
          // Sync is caught up
          clearInterval(this.syncInterval);
          this._watchLocalBlocks();
        }
      } else if (_.isObject(sync)) {
        store.dispatch(syncLocalNode(sync));
      }
    }, 1500);
  }

  _watchLocalBlocks() {
    // Reset
    if (this.watchlocalBlocksInterval) {
      clearInterval(this.watchlocalBlocksInterval);
    }

    this.watchlocalBlocksInterval = setInterval(async () => {
      const blockResult = await this.send('eth_getBlockByNumber', [
        'latest',
        false
      ]);
      const block = blockResult.result;
      if (block && block.number > store.getState().nodes.local.blockNumber) {
        store.dispatch(
          updateLocalBlock(
            parseInt(block.number, 16),
            parseInt(block.timestamp, 16)
          )
        );
      }
    }, 1500);
  }

  async setNetwork() {
    const network = await this.getNetwork();
    this._network = network;

    store.dispatch({
      type: '[MAIN]:NODES:CHANGE_NETWORK_SUCCESS',
      payload: { network }
    });

    store.dispatch({
      type: '[MAIN]:NODES:CHANGE_SYNC_MODE',
      payload: { syncMode: null }
    });
  }

  async getNetwork() {
    const blockResult = await this.send('eth_getBlockByNumber', ['0x0', false]);
    const block = blockResult.result;
    switch (block.hash) {
      case '0xd4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3':
        return 'main';
      case '0x6341fd3daf94b748c72ced5a5b26028f2474f5f00d824504e4fa37a75767e177':
        return 'rinkeby';
      case '0x41941023680923e0fe4d74a34bdac8141f2540e3ae90623718e47d66d1ca4a2d':
        return 'ropsten';
      case '0xa3c565fc15c7478862d50ccd6561e3c06b24cc509bf388941c25ea985ce32cb9':
        return 'kovan';
      default:
        return 'private';
    }
  }
}

EthereumNode.STARTING = 0;

module.exports = new EthereumNode();
