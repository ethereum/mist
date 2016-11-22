const _ = global._;
const Q = require('bluebird');
const fs = require('fs');
const { app, ipcMain: ipc } = require('electron');
const got = require('got');
const path = require('path');
const Settings = require('./settings');
const Windows = require('./windows');
const ClientBinaryManager = require('ethereum-client-binaries').Manager;
const EventEmitter = require('events').EventEmitter;

const log = require('./utils/logger').create('ClientBinaryManager');


const ALLOWED_DOWNLOAD_URLS_REGEX =
    /^https:\/\/(?:(?:[A-Za-z0-9](?:[A-Za-z0-9\-]{0,61}[A-Za-z0-9])?\.)?ethereum\.org\/|gethstore\.blob\.core\.windows\.net\/|bintray\.com\/artifact\/download\/karalabe\/ethereum\/)(?:.+)/;  // eslint-disable-line max-len

class Manager extends EventEmitter {
    constructor() {
        super();

        this._availableClients = {};
    }

    init() {
        log.info('Initializing...');

        // check every hour
        setInterval(() => this._checkForNewConfig(true), 1000 * 60 * 60);

        this._resolveEthBinPath();
        return this._checkForNewConfig();
    }

    getClient(clientId) {
        return this._availableClients[clientId.toLowerCase()];
    }

    _writeLocalConfig(json) {
        log.info('Write new client binaries local config to disk ...');

        fs.writeFileSync(
            path.join(Settings.userDataPath, 'clientBinaries.json'),
            JSON.stringify(json, null, 2)
        );
    }

    _checkForNewConfig(restart) {
        let binariesDownloaded = false;

        log.info('Checking for new client binaries config...');

        this._emit('loadConfig', 'Fetching remote client config');

        // fetch config
        return got('https://raw.githubusercontent.com/ethereum/mist/master/clientBinaries.json', {
            timeout: 3000,
            json: true,
        })
        .then((res) => {
            if (!res || _.isEmpty(res.body)) {
                throw new Error('Invalid fetch result');
            } else {
                return res.body;
            }
        })
        .catch((err) => {
            log.warn('Error fetching client binaries config from repo', err);
        })
        .then((latestConfig) => {
            let localConfig;
            let skipedVersion;
            let gethVersion = latestConfig.clients.Geth.version;

            this._emit('loadConfig', 'Fetching local config');

            try {
                // now load the local json
                localConfig = JSON.parse(
                    fs.readFileSync(path.join(Settings.userDataPath, 'clientBinaries.json')).toString()
                );

            } catch (err) {
                log.warn(`Error loading local config - assuming this is a first run: ${err}`);

                if (latestConfig) {
                    localConfig = latestConfig;

                    this._writeLocalConfig(localConfig);
                } else {
                    throw new Error('Unable to load local or remote config, cannot proceed!');
                }
            }

            try {  
                skipedVersion = fs.readFileSync(path.join(Settings.userDataPath, 'skippedNodeVersion.json')).toString();
            } catch (err) {
            }


            // if new config version available then ask user if they wish to update
            if (latestConfig &&
                JSON.stringify(localConfig) !== JSON.stringify(latestConfig) &&
                gethVersion !== skipedVersion) {
                return new Q((resolve, reject) => {

                    log.debug('New client binaries config found, asking user if they wish to update...');

                    let platform = process.platform.replace('darwin','mac').replace('win32','win').replace('freebsd','linux').replace('sunos','linux');
                    let binaryVersion = latestConfig.clients.Geth.platforms[platform][process.arch];

                    const wnd = Windows.createPopup('clientUpdateAvailable', _.extend({
                        useWeb3: false,
                        electronOptions: {
                            width: 800,
                            height: 330,
                            alwaysOnTop: false,
                            resizable: false,
                            maximizable: false,
                        },
                    }, {
                        sendData: {
                            uiAction_sendData: {
                                name: 'Geth',
                                version: gethVersion,
                                checksum: `SHA256: ${binaryVersion.download.sha256}`,
                                downloadUrl: binaryVersion.download.url,
                                restart: restart
                            }
                        }
                    }), function(update){

                        // update
                        if(update) {
                            this._writeLocalConfig(latestConfig);

                            resolve(latestConfig);

                        // skip
                        } else {
                            fs.writeFileSync(
                                path.join(Settings.userDataPath, 'skippedNodeVersion.json'),
                                gethVersion
                            );

                            resolve(localConfig);
                        }

                        wnd.close();
                    });
                });
            }

            return localConfig;

        }).then((localConfig) => {

            if(!localConfig)
                throw new Error('No config given for the ClientBinaryManager, aborting.');

            // scan for geth
            const mgr = new ClientBinaryManager(localConfig);
            mgr.logger = log;

            this._emit('scanning', 'Scanning for binaries');

            return mgr.init({
                folders: [
                    path.join(Settings.userDataPath, 'binaries', 'Geth', 'unpacked'),
                    path.join(Settings.userDataPath, 'binaries', 'Eth', 'unpacked'),
                ],
            })
            .then(() => {
                const clients = mgr.clients;

                this._availableClients = {};

                const available = _.filter(clients, c => !!c.state.available);

                if (!available.length) {
                    if (_.isEmpty(clients)) {
                        throw new Error('No client binaries available for this system!');
                    }

                    this._emit('downloading', 'Downloading binaries');

                    return Q.map(_.values(clients), (c) => {
                        binariesDownloaded = true;

                        return mgr.download(c.id, {
                            downloadFolder: path.join(Settings.userDataPath, 'binaries'),
                            urlRegex: ALLOWED_DOWNLOAD_URLS_REGEX,
                        });
                    });
                }
            })
            .then(() => {
                this._emit('filtering', 'Filtering available clients');

                _.each(mgr.clients, (client) => {
                    if (client.state.available) {
                        const idlcase = client.id.toLowerCase();

                        this._availableClients[idlcase] = {
                            binPath: Settings[`${idlcase}Path`] || client.activeCli.fullPath,
                            version: client.version,
                        };
                    }
                });

                // restart if it downloaded while running
                if(restart && binariesDownloaded) {
                    log.info('Restarting app ...');
                    app.relaunch();
                    app.quit();
                }

                this._emit('done');
            });
        })
        .catch((err) => {
            log.error(err);

            this._emit('error', err.message);
        });
    }


    _emit(status, msg) {
        log.debug(`Status: ${status} - ${msg}`);

        this.emit('status', status, msg);
    }


    _resolveEthBinPath() {
        log.info('Resolving path to Eth client binary ...');

        let platform = process.platform;

        // "win32" -> "win" (because nodes are bundled by electron-builder)
        if (platform.indexOf('win') === 0) {
            platform = 'win';
        } else if (platform.indexOf('darwin') === 0) {
            platform = 'mac';
        }

        log.debug(`Platform: ${platform}`);

        let binPath = path.join(
            __dirname,
            '..',
            'nodes',
            'eth',
            `${platform}-${process.arch}`
        );

        if (Settings.inProductionMode) {
            // get out of the ASAR
            binPath = binPath.replace('nodes', path.join('..', '..', 'nodes'));
        }

        binPath = path.join(path.resolve(binPath), 'eth');

        if (platform === 'win') {
            binPath += '.exe';
        }

        log.info(`Eth client binary path: ${binPath}`);

        this._availableClients.eth = {
            binPath,
            version: '1.3.0',
        };
    }
}


module.exports = new Manager();
