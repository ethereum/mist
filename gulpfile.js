/* eslint-disable
import/no-extraneous-dependencies,
strict,
prefer-spread
*/

'use strict';

const _ = require('underscore');
const gulp = require('gulp');
const minimist = require('minimist');
const runSeq = require('run-sequence');


// parse commandline arguments
const args = process.argv.slice(2);
const options = minimist(args, {
    string: ['walletSource'],
    boolean: ['wallet', 'mac', 'linux', 'win'],
    default: {
        wallet: false,
        walletSource: 'master',
    },
});


// prepare global variables
options.type = (options.wallet) ? 'wallet' : 'mist';
exports.options = options;


// echo version info and usage hints
console.log('Mist version:', require('./package.json').version);
console.log('Electron version:', require('electron/package.json').version);

if (_.isEmpty(_.intersection(args, ['--type', 'wallet', 'mist']))) {
    console.log('Many gulp tasks can affect the wallet using:  --type wallet');
}
if (_.isEmpty(_.intersection(args, ['--mac', '--linux', '--win']))) {
    console.log('You can specify a platform (default: all) with:  --mac --win --linux');
}


// import gulp tasks
require('require-dir')('./gulpTasks');


// tasks
gulp.task('default', ['buildQueue']);


gulp.task('buildQueue', (cb) => {
    const tasks = [];

    tasks.push('clean-dist');
    tasks.push('copy-app-source-files');
    tasks.push('copy-node-folder-files');
    tasks.push('copy-build-folder-files');
    tasks.push('switch-production');
    tasks.push('bundling-interface');
    tasks.push('copy-i18n');
    tasks.push('build-dist');
    tasks.push('release-dist');
    if (options.win) tasks.push('build-nsis');

    runSeq.apply(null, _.flatten([tasks, cb]));
});


gulp.task('uploadQueue', (cb) => {
    const tasks = [];

    tasks.push('checksums');
    tasks.push('upload-binaries');

    runSeq.apply(null, _.flatten([tasks, cb]));
});
