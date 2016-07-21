"use strict";

/**
Gets the right Node path

@module getNodePath
*/

const path = require('path');
const binaryPath = path.resolve(__dirname + '/../nodes');
const log = require('./utils/logger').create('getNodePath');
const Settings = require('./settings');


// cache
const resolvedPaths = {};


module.exports = function(type) {
    if (resolvedPaths[type]) {
        return resolvedPaths[type];
    }

    let ret = '';

    // global override?
    let globallySetType = Settings[`${type}Path`];
    
    if (globallySetType) {
        resolvedPaths[type] = globallySetType;
    } else {
        let binPath = path.join(
            __dirname, 
            '..', 
            'nodes',
            type,
            `${process.platform}-${process.arch}`
        );

        if (Settings.inProductionMode) {
            if ('darwin' === process.platform) {
                binPath = binPath.replace(
                    'nodes', path.join('..', 'nodes')
                );
            }
        }

        binPath = path.resolve(binPath);

        binPath = path.join(binPath, type);

        if ('win32' === process.platform) {
            binPath += '.exe';
        }

        resolvedPaths[type] = binPath;

        console.error(binPath);
    }

    log.debug(`Resolved path for ${type}: ${resolvedPaths[type]}`);

    return resolvedPaths[type];
};


