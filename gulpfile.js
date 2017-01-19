/* eslint-disable
import/no-extraneous-dependencies,
no-console,
strict,
prefer-spread,
arrow-body-style,
import/no-unresolved */

'use strict';

const _ = require('underscore');
const path = require('path');
const gulp = require('gulp');
const exec = require('child_process').exec;
const del = require('del');
const runSeq = require('run-sequence');
const merge = require('merge-stream');
const flatten = require('gulp-flatten');
const shell = require('shelljs');
const mocha = require('gulp-spawn-mocha');
const minimist = require('minimist');
const fs = require('fs');
const got = require('got');

const options = minimist(process.argv.slice(2), {
    string: ['platform', 'walletSource'],
    default: {
        platform: 'all',
        walletSource: 'master',
    },
});


if (options.platform.indexOf(',') !== -1) {
    options.platform = options.platform.replace(/ +/g, '').split(',');
} else {
    options.platform = options.platform.split(' ');
}

// CONFIG
let type = 'mist';
let applicationName = 'Mist';
const electronVersion = require('electron/package.json').version;
const packJson = require('./package.json');

const version = packJson.version;

const osArchList = [
    'mac-x64',
    'linux-x64',
    'linux-ia32',
    'win-x64',
    'win-ia32',
];


console.log('You can select a platform like: --platform <mac|win|linux|all>');

console.log('App type:', type);
console.log('Mist version:', version);
console.log('Electron version:', electronVersion);

if (_.contains(options.platform, 'all')) {
    options.platform = ['win', 'linux', 'mac'];
}

console.log('Selected platform:', options.platform);


function platformIsActive(osArch) {
    for (const p of options.platform) {
        if (osArch.indexOf(p) >= 0) {
            return true;
        }
    }
    return false;
}


// / --------------------------------------------------------------

// TASKS
gulp.task('set-variables-mist', () => {
    type = 'mist';
    applicationName = 'Mist';
});
gulp.task('set-variables-wallet', () => {
    type = 'wallet';
    applicationName = 'Ethereum Wallet';
});


gulp.task('clean:dist', (cb) => {
    return del([
        `./dist_${type}/**/*`,
        './meteor-dapp-wallet',
    ], cb);
});


// BUNLDE PROCESS

gulp.task('copy-app-source-files', ['clean:dist'], () => {
    return gulp.src([
        './tests/**/*.*',
        '!./tests/wallet/*.*',
        `./icons/${type}/*`,
        './modules/**/**/**/*',
        './sounds/*',
        './*.js',
        './clientBinaries.json',
        '!gulpfile.js',
    ], { base: './' })
        .pipe(gulp.dest(`./dist_${type}/app`));
});


gulp.task('copy-app-folder-files', ['copy-app-source-files'], (done) => {
    const ret = shell.exec(
        `cp -a ${__dirname}/node_modules ${__dirname}/dist_${type}/app/node_modules`
    );

    if (ret.code !== 0) {
        console.error('Error symlinking node_modules');

        return done(ret.stderr);
    }

    return done();
});


gulp.task('copy-build-folder-files', ['clean:dist', 'copy-app-folder-files'], () => {
    return gulp.src([
        `./icons/${type}/*`,
        './interface/public/images/dmg-background.jpg',
    ], { base: './' })
        .pipe(flatten())
        .pipe(gulp.dest(`./dist_${type}/build`));
});


gulp.task('copy-node-folder-files', ['clean:dist'], () => {
    const streams = [];

    _.each(osArchList, (osArch) => {
        if (platformIsActive(osArch)) {
            // copy eth node binaries
            streams.push(gulp.src([
                `./nodes/eth/${osArch}/*`,
            ])
                .pipe(gulp.dest(`./dist_${type}/app/nodes/eth/${osArch}`)));
        }
    });

    return merge.apply(null, streams);
});


gulp.task('copy-files', [
    'clean:dist',
    'copy-app-folder-files',
    'copy-build-folder-files',
    'copy-node-folder-files',
]);


gulp.task('switch-production', ['copy-files'], (cb) => {
    fs.writeFileSync(`${__dirname}/dist_${type}/app/config.json`, JSON.stringify({
        production: true,
        mode: type,
    }));

    cb();
});


gulp.task('bundling-interface', ['switch-production'], (cb) => {
    if (type === 'mist') {
        exec(`cd interface && meteor-build-client ../dist_${type}/app/interface -p ""`, (err, stdout) => {
            console.log(stdout);

            cb(err);
        });
    }

    if (type === 'wallet') {
        if (options.walletSource === 'local') {
            console.log('Use local wallet at ../meteor-dapp-wallet/app');
            exec(`cd interface/ && meteor-build-client ../dist_${type}/app/interface/ -p "" &&` +
                 `cd ../../meteor-dapp-wallet/app && meteor-build-client ../../mist/dist_${type}/app/interface/wallet -p ""`, (err, stdout) => {
                console.log(stdout);

                cb(err);
            });
        } else {
            console.log(`Pulling https://github.com/ethereum/meteor-dapp-wallet/tree/${options.walletSource} "${options.walletSource}" branch...`);
            exec(`cd interface/ && meteor-build-client ../dist_${type}/app/interface/ -p "" &&` +
                 `cd ../dist_${type}/ && git clone --depth 1 https://github.com/ethereum/meteor-dapp-wallet.git && cd meteor-dapp-wallet/app && meteor-build-client ../../app/interface/wallet -p "" && cd ../../ && rm -rf meteor-dapp-wallet`, (err, stdout) => {
                console.log(stdout);

                cb(err);
            });
        }
    }
});


// needs to be copied, so the backend can use it
gulp.task('copy-i18n', ['bundling-interface'], () => {
    return gulp.src([
        './interface/i18n/*.*',
        './interface/project-tap.i18n',
    ], { base: './' })
        .pipe(gulp.dest(`./dist_${type}/app`));
});


gulp.task('build-dist', ['copy-i18n'], (cb) => {
    console.log('Bundling platforms: ', options.platform);

    const appPackageJson = _.extend({}, packJson, {
        name: applicationName.replace(/\s/, ''),
        productName: applicationName,
        description: applicationName,
        homepage: 'https://github.com/ethereum/mist',
        build: {
            appId: `com.ethereum.${type}`,
            category: 'public.app-category.productivity',
            asar: true,
            files: [
                '**/*',
                '!nodes',
                'build-dist.js',
            ],
            extraFiles: [
                'nodes/eth/${os}-${arch}',  // eslint-disable-line no-template-curly-in-string
            ],
            linux: {
                target: [
                    'zip',
                    'deb',
                ],
            },
            win: {
                target: [
                    'zip',
                    //'squirrel',
                ],
            },
            dmg: {
                background: '../build/dmg-background.jpg',
                iconSize: 128,
                contents: [{
                    x: 441,
                    y: 448,
                    type: 'link',
                    path: '/Applications',
                },
                    {
                        x: 441,
                        y: 142,
                        type: 'file',
                    }],
            },
        },
        directories: {
            buildResources: '../build',
            app: '.',
            output: '../dist',
        },
    });

    fs.writeFileSync(
        path.join(__dirname, `dist_${type}`, 'app', 'package.json'),
        JSON.stringify(appPackageJson, null, 2),
        'utf-8'
    );

    // Copy build script
    shell.cp(
        path.join(__dirname, 'scripts', 'build-dist.js'),
        path.join(__dirname, `dist_${type}`, 'app')
    );

    // run build script
    const oses = `--${options.platform.join(' --')}`;

    const ret = shell.exec(`./build-dist.js --type ${type} ${oses}`, {
        cwd: path.join(__dirname, `dist_${type}`, 'app'),
    });

    if (ret.code !== 0) {
        console.error(ret.stdout);
        console.error(ret.stderr);

        return cb(new Error('Error building distributables'));
    }

    console.log(ret.stdout);

    return cb();
});


gulp.task('release-dist', ['build-dist'], (done) => {
    const distPath = path.join(__dirname, `dist_${type}`, 'dist');
    const releasePath = path.join(__dirname, `dist_${type}`, 'release');

    shell.rm('-rf', releasePath);
    shell.mkdir('-p', releasePath);

    const appNameHypen = applicationName.replace(/\s/, '-');
    const appNameNoSpace = applicationName.replace(/\s/, '');
    const versionDashed = version.replace(/\./g, '-');

    const cp = (inputPath, outputPath) => {
        shell.cp(path.join(distPath, inputPath), path.join(releasePath, outputPath));
    };

    _.each(osArchList, (osArch) => {
        if (platformIsActive(osArch)) {
            switch (osArch) {  // eslint-disable-line default-case
            case 'win-ia32':
                // cp(path.join('win-ia32', `${applicationName} Setup ${version}-ia32.exe`), `${appNameHypen}-win32-${versionDashed}.exe`);
                cp(`${applicationName}-${version}-ia32-win.zip`, `${appNameHypen}-win32-${versionDashed}.zip`);
                break;
            case 'win-x64':
                // cp(path.join('win', `${applicationName} Setup ${version}.exe`), `${appNameHypen}-win64-${versionDashed}.exe`);
                cp(`${applicationName}-${version}-win.zip`, `${appNameHypen}-win64-${versionDashed}.zip`);
                break;
            case 'mac-x64':
                cp(path.join('mac', `${applicationName}-${version}.dmg`), `${appNameHypen}-macosx-${versionDashed}.dmg`);
                break;
            case 'linux-ia32':
                cp(`${appNameNoSpace}_${version}_i386.deb`, `${appNameHypen}-linux32-${versionDashed}.deb`);
                cp(`${appNameNoSpace}-${version}-ia32.zip`, `${appNameHypen}-linux32-${versionDashed}.zip`);
                break;
            case 'linux-x64':
                cp(`${appNameNoSpace}_${version}_amd64.deb`, `${appNameHypen}-linux64-${versionDashed}.deb`);
                cp(`${appNameNoSpace}-${version}.zip`, `${appNameHypen}-linux64-${versionDashed}.zip`);
                break;
            }
        }

        if (platformIsActive('win')) {
            runSeq('build-nsis');
        }
    });

    done();
});


gulp.task('get-release-checksums', (done) => {
    const releasePath = `./dist_${type}/release`;

    const files = fs.readdirSync(releasePath);

    for (const file of files) {
        const sha = shell.exec(`shasum -a 256 "${file}"`, { cwd: releasePath });

        if (sha.code !== 0) {
            return done(new Error(`Error executing shasum: ${sha.stderr}`));
        }
    }

    return done();
});


gulp.task('download-signatures', (cb) => {
    got('https://www.4byte.directory/api/v1/signatures/?page_size=20000&ordering=created_at', {
        json: true,
    })
    .then((res) => {
        if (res.statusCode !== 200) {
            throw new Error(res.statusText);
        }

        const signatures = {};

        _.each(res.body.results, (e) => {
            signatures[e.hex_signature] = signatures[e.hex_signature] || [];
            signatures[e.hex_signature].push(e.text_signature);
        });

        fs.writeFileSync('interface/client/lib/signatures.js', `window.SIGNATURES = ${JSON.stringify(signatures, null, 4)};`);

        cb();
    })
    .catch(cb);
});

gulp.task('taskQueue', [
    'release-dist',
]);

// MIST task
gulp.task('mist', (cb) => {
    runSeq('set-variables-mist', 'taskQueue', cb);
});

// WALLET task
gulp.task('wallet', (cb) => {
    runSeq('set-variables-wallet', 'taskQueue', cb);
});

// WALLET task
gulp.task('mist-checksums', (cb) => {
    runSeq('set-variables-mist', 'get-release-checksums', cb);
});
gulp.task('wallet-checksums', (cb) => {
    runSeq('set-variables-wallet', 'get-release-checksums', cb);
});

gulp.task('build-nsis', (cb) => {
    const versionParts = version.split('.');
    const versionString = ''.concat('-DVERSIONMAJOR=', versionParts[0], ' -DVERSIONMINOR=', versionParts[1], ' -DVERSIONBUILD=', versionParts[2]);
    const cmdString = 'makensis'.concat(' -V3 ', versionString, ' scripts/windows-installer.nsi');
    console.log(cmdString);
    shell.exec(cmdString, cb);
});


gulp.task('test-wallet', () => {
    return gulp.src([
        './tests/wallet/*.test.js',
    ])
    .pipe(mocha({
        timeout: 60000,
        ui: 'exports',
        reporter: 'spec',
    }));
});


gulp.task('default', ['mist']);
