const EventEmitter = require('events').EventEmitter;
const Q = require('bluebird');
const path = require('path');
const fs = require('fs');
const os = require('os');
const clientBinaries = require('./../clientBinaries.json');

import Settings from './settings';
import Swarm from 'swarm-js';

let instance = null;

class SwarmNode extends EventEmitter {
  constructor() {
    super();

    if (!instance) {
      instance = this;
    }

    return instance;
  }

  getKeyPath() {
    // Gets Swarm Key path
    const swarmKeyDir = path.join(Settings.userDataPath, 'swarmjs');
    const swarmKeyPath = path.join(swarmKeyDir, 'swarmKey');

    // Generates the key if not there
    if (!fs.existsSync(swarmKeyDir)) {
      fs.mkdirSync(swarmKeyDir);
    }
    if (!fs.existsSync(swarmKeyPath)) {
      fs.writeFileSync(swarmKeyPath, web3.utils.randomHex(32));
    }

    return swarmKeyPath;
  }

  startUsingLocalNode() {
    const totalSize = 7406937; // TODO: hardcoded & innacurate, use archives.json instead
    let totalDownloaded = 0;

    const swarmBinDir = path.join(Settings.userDataPath, 'swarmjs', 'bin');
    const swarmBinExt = os.platform() === 'win32' ? '.exe' : '';
    const swarmBinPath = path.join(swarmBinDir, `swarm${swarmBinExt}`);

    const config = {
      privateKey: this.getKeyPath(),
      dataDir: path.join(Settings.userDataPath, 'swarmjs'),
      ensApi: Settings.rpcIpcPath,
      binPath: swarmBinPath,
      onProgress: size =>
        this.emit('downloadProgress', (totalDownloaded += size) / totalSize),
      archives: clientBinaries.swarm.archives
    };

    return new Q((resolve, reject) => {
      Swarm.local(config)(
        swarm =>
          new Q(stop => {
            this.emit('started', true);
            this._stop = stop;
            this._swarm = swarm;
            resolve(this);
          })
      ).catch(reject);
    });
  }

  startUsingGateway() {
    return new Q((resolve, reject) => {
      this.emit('started', false);
      this._swarm = Swarm.at(Settings.swarmURL);
      this._stop = () => {};
      resolve(this);
    });
  }

  init() {
    this.emit('starting');

    if (Settings.swarmURL === 'http://localhost:8500') {
      return this.startUsingLocalNode();
    }
    return this.startUsingGateway();
  }

  stop() {
    if (!this._swarm) {
      return Q.reject(new Error('Swarm not initialized, unable to stop.'));
    }

    this.emit('stopping');
    this._stop();
    this.emit('stopped');
  }

  upload(arg) {
    if (!this._swarm) {
      return Q.reject(new Error('Swarm not initialized, unable to upload.'));
    }

    return this._swarm.upload(arg);
  }
}

module.exports = new SwarmNode();
