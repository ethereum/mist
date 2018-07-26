import fs from 'fs';
import fso from 'original-fs'; // || fs
import path from 'path';
import http from 'http';
import https from 'https';
import { EventEmitter } from 'events';
import { app } from 'electron';
import stream from 'stream';
import crypto from 'crypto';
// 3rd party
import semver from 'semver';
import GitHub from '@octokit/rest';

function download(url, w, progress = () => {}) {
  return new Promise((resolve, reject) => {
    let protocol = /^https:/.exec(url) ? https : http;
    progress(0);
    protocol
      .get(url, res1 => {
        protocol = /^https:/.exec(res1.headers.location) ? https : http;
        protocol
          .get(res1.headers.location, res2 => {
            const total = parseInt(res2.headers['content-length'], 10);
            let completed = 0;
            res2.pipe(w);
            res2.on('data', data => {
              completed += data.length;
              progress(completed / total);
            });
            res2.on('progress', progress);
            res2.on('error', reject);
            res2.on('end', () => resolve(w.path));
          })
          .on('error', reject);
      })
      .on('error', reject);
  });
}

function shasum(data, alg) {
  return crypto
    .createHash(alg || 'sha256')
    .update(data)
    .digest('hex');
}

class StringStream extends stream.Writable {
  constructor() {
    super();
    this.str = '';
  }
  _write(data, enc, next) {
    this.str += data.toString();
    next();
  }
}

/* release / package struct
{
  name: 'short name of package'
  version: 'e.g. 1.0.1 not v1.0.1_alpha2_xyz'
  tag: 'e.g. v1.0.1_alpha2_xyz'
  filePath: 'the path to an asar file'
  downloadUrl: 'if remote: the url to fetch asar'
  error: 'set when invalid'

  checksums:

  dependencies: 'future'
  notes: 'future'
}
*/

class Repo {
  normalizeTag(tag) {
    if (tag[0] == 'v') tag = tag.slice(1);
    return tag;
  }
  compareVersions(v1, v2) {
    if (semver.gt(v1.version, v2.version)) {
      return -1;
    }
    if (semver.lt(v1.version, v2.version)) {
      return 1;
    }
    return 0;
  }
}
class GithubRepo extends Repo {
  constructor() {
    super();
    this.client = new GitHub();
    this.baseOpts = {
      owner: 'PhilippLgh',
      repo: 'mist-ui-react'
    };
  }
  async getReleases() {
    let releaseInfo = await this.client.repos.getReleases({
      owner: this.baseOpts.owner,
      repo: this.baseOpts.repo
    });

    const baseURL = `https://github.com/${this.baseOpts.owner}/${
      this.baseOpts.repo
    }/releases/download`;
    const filename = 'react_ui.asar';

    // convert to proper format
    let releases = releaseInfo.data.map(releaseInfo => {
      const version = this.normalizeTag(releaseInfo.tag_name.split('_')[0]);
      const assetUrlAsar = `${baseURL}/${releaseInfo.tag_name}/${filename}`;
      return {
        name: releaseInfo.tag_name,
        version,
        tag: releaseInfo.tag_name,
        downloadUrl: assetUrlAsar
        // error: 'set when invalid'
      };
    });
    return releases;
  }
  async getLatest() {
    let releases = await this.getReleases();
    if (releases.length <= 0) {
      return null;
    }
    let latest = releases[0];
    let meta = await this.getMetadata(latest);
    if (!meta) {
      return {
        ...latest,
        error: 'no meta data'
      };
    }
    return {
      ...latest,
      checksums: {
        sha1: meta.sha1,
        sha256: meta.sha256,
        sha512: meta.sha512
      }
    };
  }
  async getMetadata(release) {
    let downloadUrl = `https://github.com/${this.baseOpts.owner}/${
      this.baseOpts.repo
    }/releases/download/${release.tag}/metadata.json`;
    let metastream = new StringStream();
    try {
      await download(downloadUrl, metastream);
      let meta = JSON.parse(metastream.str);
      return meta;
    } catch (error) {
      console.log('metadata download failed', error.message);
      return null;
    }
  }
  async download(release, filePath, onProgress = () => {}) {
    const { downloadUrl } = release;
    // TODO download to mem and don't write until verified?
    const dest = fso.createWriteStream(filePath);
    let downloadPath = await download(downloadUrl, dest, onProgress);
    return downloadPath;
  }
}

// for different caching strategies see
// https://serviceworke.rs/caching-strategies.html
class CacheRepo extends Repo {
  constructor() {
    super();
  }
  get userDataPath() {
    return app.getPath('userData');
  }
  get releaseDataPath() {
    return path.join(this.userDataPath, 'releases');
  }
  async getReleases() {
    if (!fs.existsSync(this.releaseDataPath)) {
      return [];
    }
    let files = fs.readdirSync(this.releaseDataPath);
    let canStartFromCache = files && files.length > 0;
    if (!canStartFromCache) {
      return [];
    }
    let filePathsFull = files.map(f => path.join(this.releaseDataPath, f));
    // expand file paths to valid release / package structs
    let metadata = filePathsFull.map(f => {
      try {
        let m = JSON.parse(fs.readFileSync(path.join(f, 'metadata.json')));
        // TODO validate
        // TODO verify integratiy and authenticity
        return {
          name: m.name,
          version: m.version,
          filePath: f
        };
      } catch (error) {
        return {
          filePath: f,
          error: 'invalid package'
        };
      }
    });

    return metadata;
  }
  async getLatest() {
    let releases = await this.getReleases();
    if (releases.length === 0) {
      return null;
    }
    let filtered = releases.filter(r => !r.error);
    // sort releases by semver (major.minor.patch)
    let sorted = filtered.sort(this.compareVersions);
    return sorted[0];
  }
}

let backend = new GithubRepo();
let cache = new CacheRepo();

// updater compares versions of packages in cache and remote repositories (backends)
// if the cache is out of date the updater downloads new packages to keep both in sync
class Updater extends EventEmitter {
  constructor() {
    super();

    this.settings = {
      auto_download: false
    };

    if (app.isReady()) {
      this.start();
    } else {
      app.once('ready', () => {
        this.start();
      });
    }
  }
  get isReady() {
    this.currentPath != null;
  }
  get latest() {
    return this.currentPath;
  }
  get userDataPath() {
    return app.getPath('userData');
  }
  get releaseDataPath() {
    return path.join(this.userDataPath, 'releases');
  }
  async checkUpdate() {
    let latestCached = await cache.getLatest();
    if (latestCached) {
      console.log('cache latest: ', latestCached.version);
      // notify that ui can be started
      this.emit('app-ready', latestCached.filePath, latestCached.version);
    } else {
      latestCached = {
        version: '0.0.0'
      };
    }
    // check remote repo for updates
    let latestBackend = await backend.getLatest();
    console.log('latest backend', latestBackend && latestBackend.version);
    if (
      latestBackend &&
      semver.gt(latestBackend.version, latestCached.version)
    ) {
      // -> update available
      this.emit('update-available', latestBackend);
      return latestBackend;
    }

    return null;
  }
  async checkIntegrity(release) {
    console.log('check integrity of release', release);
    const { filePath, checksums } = release;
    // TODO promisify await
    let data;
    try {
      data = fso.readFileSync(filePath);
    } catch (error) {
      return false;
    }
    const checksumsDownload = {
      sha1: shasum(data, 'sha1'),
      sha256: shasum(data, 'sha256'),
      sha512: shasum(data, 'sha512')
    };
    let isValid = true;
    for (let alg in checksumsDownload) {
      isValid &= checksumsDownload[alg] === checksums[alg];
    }
    return isValid;
  }
  // update strategy #1 (auto-download but no auto-restart)
  async checkUpdateAndDownload() {
    let update = await this.checkUpdate();
    if (update) {
      console.log('update found: download now', update.version);
      let download = await this.downloadUpdate(update);
    }
  }
  async start() {
    if (this.settings.auto_download) {
      await this.checkUpdateAndDownload();
    } else {
      await this.checkUpdate();
    }
    this.startPollRoutine();
  }
  async downloadUpdate(update) {
    const filename = `react_ui_${update.version}.asar`;
    const outputdir = this.releaseDataPath;
    if (!fs.existsSync(outputdir)) {
      fs.mkdirSync(outputdir);
    }
    const dest = path.join(outputdir, filename);
    let pp = 0;
    let onProgress = p => {
      let pn = Math.floor(p * 100);
      if (pn > pp) {
        pp = pn;
        // console.log(`downloading update..  ${pn}%`)
        this.emit('update-progress', update, pn);
      }
    };
    try {
      let filePath = await backend.download(update, dest, onProgress);
      let release = {
        ...update,
        filePath
      };
      // TODO verify integratiy and authenticity
      let isValid = await this.checkIntegrity(release);
      if (!isValid) {
        this.emit('update-invalid', download);
        // TODO delete here? - only necessary if data was written
        return;
      }
      this.emit('update-downloaded', release);
      return release;
    } catch (error) {
      console.log('error during download:', error.message);
      return {
        ...update,
        error: error.message
      };
    }
  }
  startPollRoutine() {
    /*
    setInterval(() => {
      this.checkUpdateAndDownload()
    }, 60 * 60 * 1000)
    */
  }
}

export default new Updater();
