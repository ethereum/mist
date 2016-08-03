"use strict";

/**
Gets the right Node path

@module getNodePath
*/

const path = require('path');
const fs = require('fs');
const exec = require('child_process').exec;
const cmpVer = require('semver-compare');
const binaryPath = path.resolve(__dirname + '/../nodes');
const log = require('./utils/logger').create('getNodePath');
const Settings = require('./settings');


// cache
var paths = {},        // all versions (system + bundled):  { type: { path: version } }
    resolvedPaths = {};  // latest version:                   { type: path }
    
const resolvedPathsOld = {};  // latest version:                   { type: path }



/**
 * Get path of system node
 *
 * @param  {String} type   the type of node (i.e. 'geth', 'eth')
 */
function getSystemPath(type) {
    var proc = exec('type ' + type, (e, stdout, stderr) => {
        if (!e)
            // create new entry for path without version
            paths[type][stdout.match(/(\/\w+)+/)[0]] = null;
    });
}


/**
 * Get versions of node (system and bundled)
 *
 * @param  {String} type   the type of node (i.e. 'geth', 'eth')
 */
function getVersion(type) {
    setTimeout(() => {
        for (var path in paths[type]) {
            switch (type) {
                case 'geth':
                    var command = 'echo ' + path + ' && ' + path + ' version';  // stupid, use echo to pass path variable)
                    break;
                case 'eth':
                case 'parity':
                    var command = 'echo ' + path + ' && ' + path + ' --version';
                    break;
            }
            var proc = exec(command, (e, stdout, stderr) => {
                if (!e) {
                    // add version to path entry
                    var path = stdout.match(/(\/.+)+/)[0];
                    var version = stdout.match(/[\d.]{3,}/)[0];
                    paths[type][path] = version;
                }
            });
        }
    }, 50); // 3ms are sufficient on a SSD macbookpro for getSystemPath(type)
}


/**
 * Scans for bundled nodes
 */
 function getBundledNodes() {
    fs.readdirSync('nodes/').forEach((type) => {
        if (fs.statSync('nodes/' + type).isDirectory()) // .DS_Store files... ??
            fs.readdirSync('nodes/' + type).forEach((platform) => {
            if (platform.indexOf(process.platform) !== -1) {
                // this structure triggers the inculsion of a node type
                var nodePath = path.resolve('nodes/' + type + '/' + platform + '/' + type);
                paths[type] = {};
                paths[type][nodePath] = null;
            }
        });
    });
}


/**
 * Get paths of all nodes, returns system or bundled path depending on the latest version
 */
/*
function getNodePaths() {
    getBundledNodes();
    log.warn(paths);

    for (var type in paths) {
        getVersion(type, getSystemPath(type));
    }

    setTimeout(() => {
        // console.log(paths);  // diplays all nodes, paths + versions
        for (type in paths) {
            var path = Object.keys(paths[type])[0];
            if (Object.keys(paths[type]).length > 1) {
                path = (cmpVer(Object.keys(paths[type])[0], Object.keys(paths[type])[1])) ? Object.keys(paths[type])[0] : Object.keys(paths[type])[1]
            }
            resolvedPaths[type] = path;
        }
        log.info(resolvedPaths);
        return resolvedPaths;
    }, 1500); // 100ms (geth) / 900ms (eth) are sufficient on a SSD macbookpro (for two calls)
}*/


module.exports = function(type) {   
    if (resolvedPaths[type]) {
        return resolvedPaths[type];
    }

    getBundledNodes();

    for (var type in paths) {
        getVersion(type, getSystemPath(type));
    }

    setTimeout(() => {
        // console.log(paths);  // diplays all nodes, paths + versions
        for (type in paths) {
            var path = Object.keys(paths[type])[0];
            if (Object.keys(paths[type]).length > 1) {
                path = (cmpVer(Object.keys(paths[type])[0], Object.keys(paths[type])[1])) ? Object.keys(paths[type])[0] : Object.keys(paths[type])[1]
            }
            resolvedPaths[type] = path;
        }

        log.info('Available backends: %j', resolvedPaths);    

        return resolvedPaths[type];
    }, 1500); // 100ms (geth) / 900ms (eth) are sufficient on a SSD macbookpro (for two calls)
}

