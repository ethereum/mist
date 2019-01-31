const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const packageJson = require('../package.json');
const _ = require('./utils/underscore');
const lodash = require('lodash');

import {
  syncBuildConfig,
  syncFlags,
  setSwarmEnableOnStart
} from './core/settings/actions';
import logger from './utils/logger';

const settingsLog = logger.create('Settings');

let instance = null;

class Settings {
  constructor() {
    if (!instance) {
      instance = this;
    }

    return instance;
  }

  init() {
    const logLevel = { logLevel: argv.loglevel };
    const logFolder = { logFolder: path.join(this.userDataPath, 'logs') };
    const loggerOptions = Object.assign(argv, logLevel, logFolder);
    logger.setup(loggerOptions);

    store.dispatch(syncFlags(argv));

    // If -v flag provided, log the Mist version and exit
    if (argv.version) {
      settingsLog.info(`Mist v${this.appVersion}`);
      process.exit(0);
    }

    // Some Linux installations require this setting:
    if (argv.ignoreGpuBlacklist) {
      app.commandLine.appendSwitch('ignore-gpu-blacklist', 'true');
      store.dispatch({ type: '[MAIN]:IGNORE_GPU_BLACKLIST:SET' });
    }

    if (this.inAutoTestMode) {
      settingsLog.info('AUTOMATED TESTING');
      store.dispatch({ type: '[MAIN]:TEST_MODE:SET' });
    }

    settingsLog.info(`Running in production mode: ${this.inProductionMode}`);

    if (this.rpcMode === 'http') {
      settingsLog.warn(
        'Connecting to a node via HTTP instead of ipcMain. This is less secure!!!!'.toUpperCase()
      );
    }

    store.dispatch(syncBuildConfig('appVersion', packageJson.version));
    store.dispatch(syncBuildConfig('rpcMode', this.rpcMode));
    store.dispatch(syncBuildConfig('productionMode', this.inProductionMode));
    store.dispatch(syncBuildConfig('uiMode', this.uiMode));
  }

  // @returns "Application Support/Mist" in production mode
  // @returns "Application Support/Electron" in development mode
  get userDataPath() {
    return app.getPath('userData');
  }

  get dbFilePath() {
    const dbFileName = this.inAutoTestMode ? 'mist.test.lokidb' : 'mist.lokidb';
    return path.join(this.userDataPath, dbFileName);
  }

  get appDataPath() {
    // Application Support/
    return app.getPath('appData');
  }

  get userHomePath() {
    return app.getPath('home');
  }

  get cli() {
    return argv;
  }

  get appVersion() {
    return packageJson.version;
  }

  get appName() {
    return this.uiMode === 'mist' ? 'Mist' : 'Ethereum Wallet';
  }

  get appLicense() {
    return packageJson.license;
  }

  get uiMode() {
    return _.isString(argv.mode) ? argv.mode.toLowerCase() : argv.mode;
  }

  get inProductionMode() {
    return defaultConfig.production;
  }

  get inAutoTestMode() {
    return !!process.env.TEST_MODE;
  }

  get swarmURL() {
    return argv.swarmurl;
  }

  get gethPath() {
    return argv.gethpath;
  }

  get ethPath() {
    return argv.ethpath;
  }

  get rpcMode() {
    if (argv.rpc && argv.rpc.indexOf('http') === 0) return 'http';
    if (argv.rpc && argv.rpc.indexOf('ws:') === 0) {
      settingsLog.warn(
        'Websockets are not yet supported by Mist, using default IPC connection'
      );
      argv.rpc = null;
      return 'ipc';
    } else return 'ipc';
  }

  get rpcConnectConfig() {
    if (this.rpcMode === 'ipc') {
      return {
        path: this.rpcIpcPath
      };
    }

    return {
      hostPort: this.rpcHttpPath
    };
  }

  get rpcHttpPath() {
    return this.rpcMode === 'http' ? argv.rpc : null;
  }

  get rpcIpcPath() {
    let ipcPath = this.rpcMode === 'ipc' ? argv.rpc : null;

    if (ipcPath) {
      return ipcPath;
    }

    ipcPath = this.userHomePath;

    if (process.platform === 'darwin') {
      ipcPath += '/Library/Ethereum/geth.ipc';
    } else if (
      process.platform === 'freebsd' ||
      process.platform === 'linux' ||
      process.platform === 'sunos'
    ) {
      ipcPath += '/.ethereum/geth.ipc';
    } else if (process.platform === 'win32') {
      ipcPath = '\\\\.\\pipe\\geth.ipc';
    }

    settingsLog.debug(`IPC path: ${ipcPath}`);

    return ipcPath;
  }

  get nodeType() {
    return argv.node;
  }

  get network() {
    return argv.network;
  }

  get syncmode() {
    return argv.syncmode;
  }

  get nodeOptions() {
    return argv.nodeOptions;
  }

  get language() {
    return this.loadConfig('ui.i18n');
  }

  set language(langCode) {
    this.saveConfig('ui.i18n', langCode);
  }

  get enableSwarmOnStart() {
    if (global.mode === 'wallet') {
      return false;
    }

    if (argv.swarm) {
      return true;
    }

    const enableOnStart = this.loadConfig('swarm.enableOnStart');

    // Sync to redux
    if (enableOnStart) {
      store.dispatch(setSwarmEnableOnStart());
    }

    return enableOnStart;
  }

  set enableSwarmOnStart(bool) {
    this.saveConfig('swarm.enableOnStart', bool);
  }

  get skiptimesynccheck() {
    return argv.skiptimesynccheck;
  }

  initConfig() {
    global.config.insert({
      ui: {
        i18n: i18n.getBestMatchedLangCode(app.getLocale())
      },
      swarm: {
        enableOnStart: argv.swarm
      }
    });
  }

  saveConfig(key, value) {
    let obj = global.config.get(1);

    if (!obj) {
      this.initConfig();
      obj = global.config.get(1);
    }

    if (lodash.get(obj, key) !== value) {
      lodash.set(obj, key, value);
      global.config.update(obj);

      settingsLog.debug(`Settings: saveConfig('${key}', '${value}')`);
      settingsLog.trace(global.config.data);
    }
  }

  loadConfig(key) {
    const obj = global.config.get(1);

    if (!obj) {
      this.initConfig();
      return this.loadConfig(key);
    }

    settingsLog.trace(
      `Settings: loadConfig('${key}') = '${lodash.get(obj, key)}'`
    );

    return lodash.get(obj, key);
  }

  loadUserData(thisPath) {
    const fullPath = this.constructUserDataPath(thisPath);

    settingsLog.trace('Load user data', fullPath);

    // check if the file exists
    try {
      fs.accessSync(fullPath, fs.R_OK);
    } catch (err) {
      return null;
    }

    // try to read it
    try {
      const data = fs.readFileSync(fullPath, { encoding: 'utf8' });
      settingsLog.debug(`Reading "${data}" from ${fullPath}`);
      return data;
    } catch (err) {
      settingsLog.warn(`File not readable: ${fullPath}`, err);
    }

    return null;
  }

  saveUserData(thisPath, data) {
    if (!data) {
      // return so we dont write null, or other invalid data
      return;
    }

    const fullPath = this.constructUserDataPath(thisPath);

    try {
      settingsLog.debug(`Saving "${data}" to ${fullPath}`);
      fs.writeFileSync(fullPath, data, { encoding: 'utf8' });
    } catch (err) {
      settingsLog.warn(`Unable to write to ${fullPath}`, err);
    }
  }

  constructUserDataPath(filePath) {
    return path.join(this.userDataPath, filePath);
  }
}

module.exports = new Settings();

/* ==========================
Command line argument parsing
============================= */

// Load config
const defaultConfig = {
  mode: 'mist',
  production: false
};

try {
  _.extend(defaultConfig, require('../config.json'));
} catch (error) {
  settingsLog.error(error);
}

const argv = require('yargs')
  .usage('Usage: $0 [Mist options] [Node options]')
  .option({
    mode: {
      alias: 'm',
      demand: false,
      default: defaultConfig.mode,
      describe: 'App UI mode: wallet, mist.',
      requiresArg: true,
      nargs: 1,
      type: 'string',
      group: 'Mist options:'
    },
    node: {
      demand: false,
      default: null,
      describe: 'Node to use: geth, eth',
      requiresArg: true,
      nargs: 1,
      type: 'string',
      group: 'Mist options:'
    },
    network: {
      demand: false,
      default: null,
      describe: 'Network to connect to: main, test',
      requiresArg: true,
      nargs: 1,
      type: 'string',
      group: 'Mist options:'
    },
    rpc: {
      demand: false,
      describe:
        'Path to node IPC socket file OR HTTP RPC hostport (if IPC socket file then --node-ipcpath will be set with this value).',
      requiresArg: true,
      nargs: 1,
      type: 'string',
      group: 'Mist options:'
    },
    swarm: {
      describe: 'Enable Swarm on start.',
      requiresArg: false,
      nargs: 0,
      type: 'boolean',
      group: 'Mist options:'
    },
    swarmurl: {
      demand: false,
      default: 'http://localhost:8500',
      describe:
        'URL serving the Swarm HTTP API. If null, Mist will open a local node.',
      requiresArg: true,
      nargs: 1,
      type: 'string',
      group: 'Mist options:'
    },
    gethpath: {
      demand: false,
      describe: 'Path to Geth executable to use instead of default.',
      requiresArg: true,
      nargs: 1,
      type: 'string',
      group: 'Mist options:'
    },
    ethpath: {
      demand: false,
      describe: 'Path to Eth executable to use instead of default.',
      requiresArg: true,
      nargs: 1,
      type: 'string',
      group: 'Mist options:'
    },
    'ignore-gpu-blacklist': {
      demand: false,
      describe: 'Ignores GPU blacklist (needed for some Linux installations).',
      requiresArg: false,
      nargs: 0,
      type: 'boolean',
      group: 'Mist options:'
    },
    'reset-tabs': {
      demand: false,
      describe: 'Reset Mist tabs to their default settings.',
      requiresArg: false,
      nargs: 0,
      type: 'boolean',
      group: 'Mist options:'
    },
    loglevel: {
      demand: false,
      default: 'info',
      describe:
        'Minimum logging threshold: info, debug, error, trace (shows all logs, including possible passwords over IPC!).',
      requiresArg: true,
      nargs: 1,
      type: 'string',
      group: 'Mist options:'
    },
    syncmode: {
      demand: false,
      requiresArg: true,
      describe: 'Geth synchronization mode: [fast|light|full|nosync]',
      nargs: 1,
      type: 'string',
      group: 'Mist options:'
    },
    version: {
      alias: 'v',
      demand: false,
      requiresArg: false,
      nargs: 0,
      describe: 'Display Mist version.',
      group: 'Mist options:',
      type: 'boolean'
    },
    skiptimesynccheck: {
      demand: false,
      requiresArg: false,
      nargs: 0,
      describe:
        'Disable checks for the presence of automatic time sync on your OS.',
      group: 'Mist options:',
      type: 'boolean'
    },
    '': {
      describe:
        'To pass options to the underlying node (e.g. Geth) use the --node- prefix, e.g. --node-datadir',
      group: 'Node options:'
    }
  })
  .help('h')
  .alias('h', 'help')
  .parse(process.argv.slice(1));

argv.nodeOptions = [];

for (const optIdx in argv) {
  if (optIdx.indexOf('node-') === 0) {
    argv.nodeOptions.push(`--${optIdx.substr(5)}`);

    if (argv[optIdx] !== true) {
      argv.nodeOptions.push(argv[optIdx]);
    }
  }
}

// some options are shared
if (argv.ipcpath) {
  argv.nodeOptions.push('--ipcpath', argv.ipcpath);
}

if (argv.nodeOptions && argv.nodeOptions.syncmode) {
  argv.push('--syncmode', argv.nodeOptions.syncmode);
}
