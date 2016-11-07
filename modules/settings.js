const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');
const packageJson = require('../package.json');


// try loading in config file
const defaultConfig = {
    mode: 'mist',
    production: false,
};
try {
    _.extend(defaultConfig, require('../config.json'));
} catch (err) {
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
        rpc: {
            demand: false,
            describe: 'Path to node IPC socket file OR HTTP RPC hostport (if IPC socket file then --node-ipcpath will be set with this value).',
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
            describe: 'Minimum logging threshold: info, debug, error, trace (shows all logs, including possible passwords over IPC!).',
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
            describe: 'To pass options to the underlying node (e.g. Geth) use the --node- prefix, e.g. --node-datadir',
            group: 'Node options:',
        },
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

        break;
    }
}

// some options are shared
if (argv.ipcpath) {
    argv.nodeOptions.push('--ipcpath', argv.ipcpath);
}


const log = null;


class Settings {
    init() {
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
        return argv.mode;
    }

    get inProductionMode() {
        return defaultConfig.production;
    }

    get inAutoTestMode() {
        return !!process.env.TEST_MODE;
    }

    get gethPath() {
        return argv.gethpath;
    }

    get ethPath() {
        return argv.ethpath;
    }

    get rpcMode() {
        return (argv.rpc && argv.rpc.indexOf('.ipc') < 0) ? 'http' : 'ipc';
    }

    get rpcConnectConfig() {
        if (this.rpcMode === 'ipc') {
            return {
                path: this.rpcIpcPath,
            };
        } else {
            return {
                hostPort: this.rpcHttpPath,
            };
        }
    }

    get rpcHttpPath() {
        return (this.rpcMode === 'http') ? argv.rpc : null;
    }

    get rpcIpcPath() {
        let ipcPath = (this.rpcMode === 'ipc') ? argv.rpc : null;

        if (ipcPath) {
            return ipcPath;
        }

        ipcPath = this.userHomePath;

        if (process.platform === 'darwin') {
            ipcPath += '/Library/Ethereum/geth.ipc';
        } else if (process.platform === 'freebsd' ||
       process.platform === 'linux' ||
       process.platform === 'sunos') {
            ipcPath += '/.ethereum/geth.ipc';
        } else if (process.platform === 'win32') {
            ipcPath = '\\\\.\\pipe\\geth.ipc';
        }

        this._log.debug(`IPC path: ${ipcPath}`);

        return ipcPath;
    }

    get nodeType() {
        return argv.node;
    }

    get network() {
        return argv.network;
    }

    get nodeOptions() {
        return argv.nodeOptions;
    }

    loadUserData(path) {
        const fullPath = this.constructUserDataPath(path);

        this._log.trace('Load user data', fullPath);

      // check if the file exists
        try {
            fs.accessSync(fullPath, fs.R_OK);
        } catch (err) {
            return null;
        }

      // try to read it
        try {
            return fs.readFileSync(fullPath, { encoding: 'utf8' });
        } catch (err) {
            this._log.warn(`File not readable: ${fullPath}`, err);
        }

        return null;
    }


    saveUserData(path, data) {
        if (!data) return; // return so we dont write null, or other invalid data

        const fullPath = this.constructUserDataPath(path);

        try {
            fs.writeFileSync(fullPath, data, { encoding: 'utf8' });
        } catch (err) {
            this._log.warn(`Unable to write to ${fullPath}`, err);
        }
    }


    constructUserDataPath(filePath) {
        return path.join(this.userDataPath, filePath);
    }

}

module.exports = new Settings();
