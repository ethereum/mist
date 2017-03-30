const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');
const packageJson = require('../package.json');
const _ = require('./utils/underscore');


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
        clientbinaries: {
            demand: false,
            describe: 'Path to clientBinaries.json file to use instead of default.',
            requiresArg: true,
            nargs: 1,
            type: 'string',
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


class Settings {
    init() {
        logger.setup(argv);

        this._log = logger.create('Settings');
        this._log.warn('init settings')
    }

    get userDataPath() {
    // Application Aupport/Mist
        return app.getPath('userData');
    }

    get dbFilePath() {
        const dbFileName = (this.inAutoTestMode) ? 'mist.test.lokidb' : 'mist.lokidb';
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
        return (_.isString(argv.mode)) ? argv.mode.toLowerCase() : argv.mode;
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
        if (argv.rpc && argv.rpc.indexOf('http') === 0) {
            return 'http';
        }
        if (argv.rpc && argv.rpc.indexOf('ws:') === 0) {
            this._log.warn('Websockets are not yet supported by Mist, using default IPC connection');
            argv.rpc = null;
            return 'ipc';
        }
        return 'ipc';
    }

    get rpcConnectConfig() {
        if (this.rpcMode === 'ipc') {
            return {
                path: this.rpcIpcPath,
            };
        }

        return {
            hostPort: this.rpcHttpPath,
        };
    }

    get rpcHttpPath() {
        return (this.rpcMode === 'http') ? argv.rpc : null;
    }

    get clientBinariesJSON() {
        if (argv.clientbinaries) {
            return require(path.resolve(argv.clientbinaries));
        }

        const downloadedConfig = path.join(this.userDataPath, 'clientBinaries.json');
        const config = (fs.existsSync(downloadedConfig)) ? require(downloadedConfig) : require('../clientBinaries.json');  // eslint-disable-line global-require, import/no-dynamic-require
        return config;
    }

    get nodeDataPath() {
        // console.log(global.config.find('nodeDataPath'));
        const json = this.clientBinariesJSON.clients;
        const config = json.Geth.platforms[this.platform][process.arch];
        const dataDir = path.join(this.userHomePath, config.paths.mainnet.dataDir);

        return dataDir;
    }

    get platform() {
        return process.platform.replace('darwin', 'mac').replace('win32', 'win').replace('freebsd', 'linux').replace('sunos', 'linux');
    }


    get rpcIpcPath() {
        const ipcPaths = [];
        if (argv.rpc && this.rpcMode === 'ipc') ipcPaths.push(argv.rpc);

        if (!_.isEmpty(ipcPaths)) {
            return ipcPaths[0];
        }

        const json = this.clientBinariesJSON.clients;

        const config = json.Geth.platforms[this.platform][process.arch].paths;

        _.each(config, (network) => {
            const tmpPath = path.join(this.userHomePath, network.dataDir, network.ipcFile);
            if (fs.existsSync(tmpPath)) ipcPaths.push(tmpPath);
        });

        if (_.isEmpty(ipcPaths)) {
            this._log.warn(config[this.network])
            const tmpPath = path.join(this.userHomePath,
                config[this.network].dataDir,
                config[this.network].ipcFile
            );
            return tmpPath;
        }

        // TODO windows compatibility
        // TODO array/string


        // TODO doesn't catch edge case:
        // mainnet geth crashed leaving dead IPC file +
        // valid external instance for testnet running (won't connect)

        this._log.debug(`IPC path: ${ipcPaths}`);

        return ipcPaths[0];
    }

    get nodeOptions() {
        return argv.nodeOptions;
    }

    get nodeType() {
        return (argv.node) ? argv.node : this.loadConfig('node.type');
    }

    set nodeType(type) {
        this.saveConfig('node.type', type);
    }

    get network() {
        return (argv.network) ? argv.network : this.loadConfig('node.network');
    }

    set network(network) {
        this.saveConfig('node.network', network);
    }

    get language() {
        return this.loadConfig('i18n');
    }

    set language(langCode) {
        this.saveConfig('i18n', langCode);
    }

    initConfig() {
        global.config.insert({
            i18n: i18n.getBestMatchedLangCode(app.getLocale()),
            node: {
                type: 'geth',
                network: 'main'
            }
        });
    }

    saveConfig(key, value) {
        const query = {};
        query[key] = {
            $ne: ''
        };

        let obj = global.config.findOne(query);

        if (!obj) {
            this.initConfig();

            obj = global.config.findOne(query);
        } else if (eval(`obj.${key}`) !== value) {
            eval(`obj.${key} = '${value}'`);
            global.config.update(obj);
        }
    }

    loadConfig(key) {
        const query = {};
        query[key] = {
            $ne: ''
        };

        const obj = global.config.findOne(query);

        if (!obj) {
            this.initConfig();
            return this.loadConfig(key);
        }

        return eval(`obj.${key}`);
    }

    loadUserData(path2) {
        const fullPath = this.constructUserDataPath(path2);

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


    saveUserData(path2, data) {
        if (!data) return; // return so we dont write null, or other invalid data

        const fullPath = this.constructUserDataPath(path2);

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
