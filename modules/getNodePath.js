"use strict";

/**
Gets the right Node path

@module getNodePath
*/

const path = require('path');
const exec = require('child_process').exec;
const binaryPath = path.resolve(__dirname + '/../nodes');
const log = require('./utils/logger').create('getNodePath');
const Settings = require('./settings');
const gulpfile = require('./../gulpfile.js');


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
        var binPath = (Settings.inProductionMode)
            ? binaryPath.replace('nodes','node') + '/'+ type +'/'+ type
            : binaryPath + '/'+ type +'/'+ process.platform +'-'+ process.arch + '/'+ type;

        if(/*Settings.inProductionMode*/ true) {    
            if(process.platform === 'linux' || 'darwin') {
                var systemGethPath;
                var proc = exec('which geth', 
                    function(error, stdout, stderr) {
                        systemGethPath = stdout.toString().replace(/\n/, '');
                        if (error !== null) {
                                log.error("error exec 'which geth': " + error + stdout);
                        }
                    });
                
                var systemGethVersion;
                setTimeout(function () {
                    if(systemGethPath !== null) {
                        log.error(systemGethPath);
                        var proc = exec(systemGethPath + ' version', 
                            function(error, stdout, stderr) {
                                systemGethVersion = stdout.match(/(?:[\d.]+)/)[0];
                                log.warn('Geth node version: ' + systemGethVersion);
                                log.warn(gulpfile.gethVersion);
                                if (error !== null) {
                                        log.error("error exec 'geth version': " + error);
                                }
                            });
                    }
                log.warn('Geth node found at ' + systemGethPath);
                }, 1000);

            }

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


