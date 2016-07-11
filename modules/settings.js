const electron = require('electron');
const app = electron.app;

const logger = require('./utils/logger');
const packageJson = require('../package.json');


// try loading in config file
let defaultConfig = {
    mode: 'mist',
    production: false,
};
try {
    _.extend(defaultConfig, require('../config.json'));
} catch (err) {
}





const argv = require('yargs')
    .usage('Usage: $0 [Mist options] -- [Node options]')
    .option({
        mode: {
            alias: 'm',
            demand: false,
            default: defaultConfig.mode,
            describe: 'App UI mode: wallet, mist.',
            requiresArg: true,
            nargs: 1,
            type: 'string',
            group: 'Mist options:',
        },
        node: {
            demand: false,
            default: null,
            describe: 'Node to use: geth, eth',
            requiresArg: true,
            nargs: 1,
            type: 'string',
            group: 'Mist options:',
        },
        network: {
            demand: false,
            default: null,
            describe: 'Network to connect to: main, test',
            requiresArg: true,
            nargs: 1,
            type: 'string',
            group: 'Mist options:',
        },
        ipcpath: {
            demand: false,
            describe: 'Path to node IPC socket file (this will automatically get passed as an option to Geth).',
            requiresArg: true,
            nargs: 1,
            type: 'string',
            group: 'Mist options:',
        },
        gethpath: {
            demand: false,
            describe: 'Path to Geth executable to use instead of default.',
            requiresArg: true,
            nargs: 1,
            type: 'string',
            group: 'Mist options:',
        },
        ethpath: {
            demand: false,
            describe: 'Path to Eth executable to use instead of default.',
            requiresArg: true,
            nargs: 1,
            type: 'string',
            group: 'Mist options:',
        },
        'ignore-gpu-blacklist': {
            demand: false,
            describe: 'Ignores GPU blacklist (needed for some Linux installations).',
            requiresArg: false,
            nargs: 0,
            type: 'boolean',
            group: 'Mist options:',
        },
        'reset-tabs': {
            demand: false,
            describe: 'Reset Mist tabs to their default settings.',
            requiresArg: false,
            nargs: 0,
            type: 'boolean',
            group: 'Mist options:',            
        },
        logfile: {
            demand: false,
            describe: 'Logs will be written to this file in addition to the console.',
            requiresArg: true,
            nargs: 1,
            type: 'string',
            group: 'Mist options:',            
        },
        loglevel: {
            demand: false,
            default: 'info',
            describe: 'Minimum logging threshold: trace (all logs), debug, info, warn, error.',
            requiresArg: true,
            nargs: 1,
            type: 'string',
            group: 'Mist options:',                        
        },
        version: {
            alias: 'v',
            demand: false,
            requiresArg: false,
            nargs: 0,
            describe: 'Display Mist version.',
            group: 'Mist options:',
            type: 'boolean',
        },
        '': {
            describe: 'All options will be passed onto the node (e.g. Geth).',
            group: 'Node options:',
        }
    })
    .help('h')
    .alias('h', 'help')
    .parse(process.argv.slice(1));



argv.nodeOptions = [];

for (let optIdx in argv) {
    if (0 === optIdx.indexOf('node-')) {
        argv.nodeOptions.push('--' + optIdx.substr(5));
        argv.nodeOptions.push(argv[optIdx]);

        break;
    }
}

// some options are shared
if (argv.ipcpath) {
    argv.nodeOptions.push('--ipcpath', argv.ipcpath);
}



var log = null;


class Settings {
  init () {
    logger.setup(argv);

    this._log = logger.create('Settings');    
  }

  get userDataPath() {
    // Application Aupport/Mist
    return app.getPath('userData');
  }

  get appDataPath() {
    // Application Support/
    return app.getPath('appData');
  }

  get userHomePath() {
    return app.getPath('home');
  }

  get cli () {
    return argv;
  }

  get appVersion () {
    return packageJson.version;
  }

  get appName () {
    return 'mist' === this.uiMode ? 'Mist' : 'Ethereum Wallet';
  }

  get appLicense () {
    return packageJson.license;
  }

  get uiMode () {
    return argv.mode;
  }

  get inProductionMode () {
    return defaultConfig.production;
  }

  get inAutoTestMode () {
    return !!process.env.TEST_MODE;
  }

  get gethPath () {
    return argv.gethpath;
  }

  get ethPath () {
    return argv.ethpath;
  }

  get ipcPath () {
    return argv.ipcpath;
  }

  get nodeType () {
    return argv.node;
  }

  get network () {
    return argv.network;
  }

  get nodeOptions () {
    return argv.nodeOptions;
  }


}

module.exports = new Settings();
