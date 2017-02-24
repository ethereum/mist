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
const platforms = ['mac', 'linux', 'win'];
const options = minimist(args, {
    string: ['walletSource'],
    boolean: _.flatten(['wallet', platforms]),
    default: {
        wallet: false,
        walletSource: 'master',
    },
});


// echo version info and usage hints
console.log('Mist version:', require('./package.json').version);
console.log('Electron version:', require('electron/package.json').version);

if (_.isEmpty(_.intersection(args, ['--type', 'wallet', 'mist']))) {
    console.log('Many gulp tasks can affect the wallet using:  --type wallet');
}
if (_.isEmpty(_.intersection(args, ['--mac', '--linux', '--win']))) {
    console.log('You can specify a platform (default: all) with:  --mac --win --linux');
    _.each(platforms, (platform) => { options[platform] = true; }); // activate all platform flags
}


// prepare global variables (shared with other gulp task files)
options.type = (options.wallet) ? 'wallet' : 'mist';
options.platforms = platforms;
options.activePlatforms = _.keys(_.pick(_.pick(options, platforms), (key) => { return key; }));

exports.options = options;


// import gulp tasks
require('require-dir')('./gulpTasks');


// tasks
gulp.task('default', ['buildQueue']);


gulp.task('buildQueue', (cb) => {
    const tasks = [];

    tasks.push('clean-dist');
    tasks.push('copy-app-source-files');
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
