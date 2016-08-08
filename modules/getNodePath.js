"use strict";

/**
Gets the right Node path

@module getNodePath
*/

const fs = require('fs');
const path = require('path');
const Q = require('bluebird');
const exec = require('child_process').exec;
const cmpVer = require('semver-compare');
const binaryPath = path.resolve(__dirname + '/../nodes');
const log = require('./utils/logger').create('getNodePath');
const Settings = require('./settings');


// cache
const paths = {},        // all versions (system + bundled):  { type: { path: version } }
    resolvedPaths = {};  // latest version:                   { type: path }


/**
 * Get path of system node
 *
 * @param  {String} type   the type of node (i.e. 'geth', 'eth')
 */
function getSystemPath(type) {
    return new Q((resolve, reject) => {
        var proc = exec('type ' + type);
        proc.stdout.on('data', resolve);
    });
}


/**
 * Get versions of node (system and bundled)
 *
 * @param  {String} type   the type of node (i.e. 'geth', 'eth')
 * @param  {String} path   the path of the node instance
 */
function getVersion(type, path) {
    return new Q((resolve, reject) => {
        switch (type) {
            case 'geth':
                var command = path + ' version';
                break;
            case 'eth':
            case 'parity':
                var command = path + ' --version';
                break;
        }
        var proc = exec(command);
        proc.stdout.on('data', resolve);
    });
}


/**
 * Compare versions of system and bundled nodes
 */
function compareNodes() {
    return new Q((resolve, reject) => {
        for (let type in paths) {
            var path = Object.keys(paths[type])[0];
            if (Object.keys(paths[type]).length > 1) {
                path = (cmpVer(Object.keys(paths[type])[0], Object.keys(paths[type])[1])) ? Object.keys(paths[type])[0] : Object.keys(paths[type])[1]
            }
            resolvedPaths[type] = path;
        }
    });
}


module.exports = {
    /**
     * Returns path of node
     * linux and mac only: returns system or bundled path depending on the latest version
     *
     * @param  {String} type   the type of node (i.e. 'geth', 'eth')
     */
    query: () => {
        return resolvedPaths;
    },
    /**
     * Evaluates node paths
     *  - Enumerates bundled nodes
     * linux and mac only:
     *  - probes for system installation of nodes
     *  - compares the versions of bundled and system nodes (preferres latest version)
     */
    probe: () => {    
        return new Q((resolve, reject) => {                        
            if(Settings.inProductionMode) {
                var binPath = binaryPath.replace('nodes','node').replace('app.asar/','').replace('app.asar\\','');
                
                if(process.platform === 'darwin') {
                    binPath = path.resolve(binPath.replace('/node', '/../Frameworks/node'));
                }

                fs.readdirSync(binPath).forEach((type) => {
                    var nodePath = binPath + '/' + type + '/' + type;

                    if(process.platform === 'win32') {
                        nodePath = nodePath.replace(/\/+/,'\\');
                        nodePath += '.exe';
                    }

                    paths[type] = {};
                    paths[type][nodePath] = null;
                });
            } else {
                fs.readdirSync('nodes/').forEach((type) => {
                    if (fs.statSync('nodes/' + type).isDirectory()) {
                        var nodePath = path.resolve('nodes/' + type + '/' + process.platform +'-'+ process.arch + '/' + type);
                        paths[type] = {};
                        paths[type][nodePath] = null;
                    }
                });
            }
            
            if (process.platform === 'linux' || process.platform === 'darwin') {
                var getPathProms = [],
                    getVersionProms = [];

                for (let type in paths) {
                    getPathProms.push(getSystemPath(type)
                        .then((data) => {
                            paths[type][data.match(/(\/\w+)+/)[0]] = null;
                    }));
                }

                Q.all(getPathProms).then(() => {
                    for (let type in paths) {
                        for (let path in paths[type]) {
                            getVersionProms.push(getVersion(type, path)
                            .then((data)=>{
                                var version = data.match(/[\d.]+/)[0];
                                paths[type][path] = version;
                            }));
                        }
                    }
                }).then(() => {
                    Q.all(getVersionProms).then(() => {
                        compareNodes();
                        log.debug('Available backends: %j', paths);
                    })                    
                    .then(resolve, reject);
                })
            } else {
                for (let type in paths) {
                    for (let path in paths[type]) {
                        resolvedPaths[type] = path;
                    }
                }
                log.debug('Available backends: %j', paths);
                resolve();
            }
        });
    }
}
