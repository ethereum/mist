"use strict";

const _ = require('underscore');
const path = require('path');
const packageJson = require('./package.json');


/**
 * Create distributable package folder name.
 * @param  {String} os   Operating system.
 * @param  {String} mode App mode - `mist` or `wallet`.
 * @param {Object} [options] Options.
 * @param {Boolean} [options.replaceOs] Whether to friendly OS name.
 * @param {Boolean} [options.includeVersion] Whether to include version in name.
 * @return {String}
 */
exports.buildDistPkgName = function(os, mode, options) {
    options = _.extend({
        replaceOs: false,
        includeVersion: false,
    }, options);

    let newOs = os;

    if (options.replaceOs) {
        if(os.indexOf('win32') !== -1) {
            newOs = os.replace('win32-ia32','win32').replace('win32-x64','win64');
        }
        if(os.indexOf('darwin') !== -1) {
            newOs = 'macosx';
        }
        if(os.indexOf('linux') !== -1) {
            newOs = os.replace('linux-x64','linux64').replace('linux-ia32','linux32');
        }        
    }

    let filenameUppercase = exports.buildAppExecName(mode);

    filenameUppercase = filenameUppercase +'-'+ newOs;

    if (options.includeVersion) {
        filenameUppercase = filenameUppercase + '-'+ packageJson.version.replace(/\./g,'-');
    }

    return filenameUppercase;
};



exports.buildAppExecName = function(mode) {
    return ('wallet' === mode)
            ? 'Ethereum-Wallet'
            : 'Mist';
};



exports.buildDistPath = function(mode, relativePath) {
    return path.join(__dirname, `dist_${mode}`, relativePath || '');
};






