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
    let globallySetType = Settings.get(`${type}Path`);
    
    if (globallySetType) {
        resolvedPaths[type] = globallySetType;
    } else {
        var binPath = (global.production)
            ? binaryPath.replace('nodes','node') + '/'+ type +'/'+ type
            : binaryPath + '/'+ type +'/'+ process.platform +'-'+ process.arch + '/'+ type;

        if(global.production) {
            binPath = binPath.replace('app.asar/','').replace('app.asar\\','');
            
            if(process.platform === 'darwin') {
                binPath = path.resolve(binPath.replace('/node/', '/../Frameworks/node/'));
            }
        }


        if(process.platform === 'win32') {
            binPath = binPath.replace(/\/+/,'\\');
            binPath += '.exe';
        }

        resolvedPaths[type] = binPath;
    }

    log.debug(`Resolved path for ${type}: ${resolvedPaths[type]}`);

    return resolvedPaths[type];
};


