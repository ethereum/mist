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

// available crossplatform builds
let platforms;
if (process.platform === 'darwin') {
    platforms = ['mac', 'linux', 'win'];
} else if (process.platform === 'win32') {
    platforms = ['win'];
} else {
    platforms = ['linux', 'win'];
}

// parse commandline arguments
const args = process.argv.slice(2);
const options = minimist(args, {
    string: ['walletSource', 'test', 'skipTasks'],
    boolean: _.flatten(['wallet', platforms]),
    default: {
        wallet: false,
        walletSource: 'master',
        test: 'basic',
        skipTasks: '',
    },
});


// echo version info and usage hints
console.log('Mist version:', require('./package.json').version);
console.log('Electron version:', require('electron/package.json').version);

if (_.isEmpty(_.intersection(args, ['--wallet']))) {
    console.log('Many gulp tasks can be run in wallet mode using:  --wallet');
}

const platformFlags = platforms.map((platform) => { return `--${platform}`; });
if (_.isEmpty(_.intersection(args, platformFlags))) {
    console.log(`To specify a platform (default: all) use:  ${platformFlags.join(' ')}`);
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
    const skipTasks = options.skipTasks.split(',');
    let tasks = [
        'clean-dist',
        'copy-app-source-files',
        'transpile-main',
        'transpile-modules',
        'copy-build-folder-files',
        'switch-production',
        'bundling-interface',
        'copy-i18n',
        'build-dist',
        'release-dist',
    ];

    if (options.win) tasks.push('build-nsis');

    tasks = _.difference(tasks, skipTasks);

    runSeq.apply(null, _.flatten([tasks, cb]));
});


gulp.task('uploadQueue', (cb) => {
    const tasks = [];

    tasks.push('checksums');
    tasks.push('upload-binaries');

    runSeq.apply(null, _.flatten([tasks, cb]));
});
