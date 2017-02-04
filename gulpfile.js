/* eslint-disable
import/no-extraneous-dependencies,
strict,
prefer-spread
*/

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
const Q = require('bluebird');
const githubUpload = Q.promisify(require('gh-release-assets'));
const cmp = require('semver-compare');
const parseJson = require('xml2js').parseString;

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
    ], {
        base: './'
    })
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
    ], {
        base: './'
    })
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
    ], {
        base: './'
    })
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
                'nodes/eth/${os}-${arch}', // eslint-disable-line no-template-curly-in-string
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
                    }
                ],
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
            switch (osArch) { // eslint-disable-line default-case
            case 'win-ia32':
                cp(`${applicationName}-${version}-ia32-win.zip`, `${appNameHypen}-win32-${versionDashed}.zip`);
                break;
            case 'win-x64':
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
    });

    done();
});

gulp.task('upload-binaries', () => {
    // if CI detected only upload if master branch
    if (process.env.CI && process.env.TRAVIS_BRANCH !== 'master') return;

    // token must be set using travis' ENVs
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

    // query github releases
    got(`https://api.github.com/repos/ethereum/mist/releases?access_token=${GITHUB_TOKEN}`, {
        json: true,
    })
    // filter draft with current version's tag
    .then((res) => {
        const draft = res.body[_.indexOf(_.pluck(res.body, 'tag_name'), `v${version}`)];

        if (draft === undefined) throw new Error(`Couldn't find github release draft for v${version} release tag`);

        return draft;
    })
    // upload binaries from release folders
    .then((draft) => {
        const dir = `dist_${type}/release`;
        const files = fs.readdirSync(dir);
        const filePaths = _.map(files, (file) => { return path.join(dir, file); });

        // check if draft already contains target binaries
        const existingAssets = _.intersection(files, _.pluck(draft.assets, 'name'));
        if (!_.isEmpty(existingAssets)) throw new Error(`Github release draft already contains assets (${existingAssets}); will not upload, please remove and trigger rebuild`);

        return githubUpload({
            url: `https://uploads.github.com/repos/ethereum/mist/releases/${draft.id}/assets{?name}`,
            token: [GITHUB_TOKEN],
            assets: filePaths,
        }).then((res) => {
            console.log(`Successfully uploaded ${res} to v${version} release draft.`);
        });
    })
    .catch((err) => {
        console.log(err);
    });
});

gulp.task('get-release-checksums', (done) => {
    const releasePath = `./dist_${type}/release`;

    const files = fs.readdirSync(releasePath);

    for (const file of files) {
        const sha = shell.exec(`shasum -a 256 "${file}"`, {
            cwd: releasePath
        });

        if (sha.code !== 0) {
            return done(new Error(`Error executing shasum: ${sha.stderr}`));
        }
    }

    return done();
});

gulp.task('update-nodes', (cb) => {
    const clientBinaries = require('./clientBinaries.json'); // eslint-disable-line global-require
    const clientBinariesGeth = clientBinaries.clients.Geth;
    const localGethVersion = clientBinariesGeth.version;
    const newJson = clientBinaries;
    const geth = newJson.clients.Geth;

    // Query latest geth version
    got('https://api.github.com/repos/ethereum/go-ethereum/releases/latest', { json: true })
    .then((response) => {
        return response.body.tag_name;
    })
    // Return tag name (e.g. 'v1.5.0')
    .then((tagName) => {
        const latestGethVersion = tagName.match(/\d+\.\d+\.\d+/)[0];

        // Compare to current geth version in clientBinaries.json
        if (cmp(latestGethVersion, localGethVersion)) {
            geth.version = latestGethVersion;

            // Query commit hash (first 8 characters)
            got(`https://api.github.com/repos/ethereum/go-ethereum/commits/${tagName}`, { json: true })
            .then((response) => {
                return String(response.body.sha).substr(0, 8);
            })
            .then((hash) => {
                let blobs; // azure blobs

                // Query Azure assets for md5 hashes
                got('https://gethstore.blob.core.windows.net/builds?restype=container&comp=list', { xml: true })
                .then((response) => {
                    parseJson(response.body, (err, data) => {
                        blobs = data.EnumerationResults.Blobs[0].Blob;
                    });

                    // For each platform/arch in clientBinaries.json
                    _.keys(geth.platforms).forEach((platform) => {
                        _.keys(geth.platforms[platform]).forEach((arch) => {
                            // Update URL
                            let url = geth.platforms[platform][arch].download.url;
                            url = url.replace(/\d+\.\d+\.\d+-[a-z0-9]{8}/, `${latestGethVersion}-${hash}`);
                            geth.platforms[platform][arch].download.url = url;

                            // Update bin name (path in archive)
                            let bin = geth.platforms[platform][arch].download.bin;
                            bin = bin.replace(/\d+\.\d+\.\d+-[a-z0-9]{8}/, `${latestGethVersion}-${hash}`);
                            geth.platforms[platform][arch].download.bin = bin;

                            // Update expected sanity-command version output
                            geth.platforms[platform][arch].commands.sanity.output[1] =
                            String(latestGethVersion);

                            // Update md5 checksum
                            blobs.forEach((blob) => {
                                if (String(blob.Name) === _.last(geth.platforms[platform][arch].download.url.split('/'))) {
                                    const sum = new Buffer(blob.Properties[0]['Content-MD5'][0], 'base64');

                                    geth.platforms[platform][arch].download.md5 = sum.toString('hex');
                                }
                            });
                        });
                    });
                })
                // Update clientBinares.json
                .then(() => {
                    fs.writeFile('./clientBinaries.json', JSON.stringify(newJson, null, 4));
                    cb();
                });
            });
        } else cb(); // Already up-to-date
    })
    .catch(cb);
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

// MIST task
gulp.task('mist', (cb) => {
    runSeq('set-variables-mist', 'release-dist', 'build-nsis', 'upload-binaries', cb);
});

// WALLET task
gulp.task('wallet', (cb) => {
    runSeq('set-variables-wallet', 'release-dist', 'build-nsis', 'upload-binaries', cb);
});

// WALLET task
gulp.task('mist-checksums', (cb) => {
    runSeq('set-variables-mist', 'get-release-checksums', cb);
});
gulp.task('wallet-checksums', (cb) => {
    runSeq('set-variables-wallet', 'get-release-checksums', cb);
});

gulp.task('build-nsis', (cb) => {
    if (platformIsActive('win')) {
        const typeString = `-DTYPE=${type}`;
        const appNameString = `-DAPPNAME=${applicationName.replace(/\s/, '-')}`;
        const versionParts = version.split('.');
        const versionString = `-DVERSIONMAJOR=${versionParts[0]} -DVERSIONMINOR=${versionParts[1]} -DVERSIONBUILD=${versionParts[2]}`;
        const cmdString = `makensis -V3 ${versionString} ${typeString} ${appNameString} scripts/windows-installer.nsi`;
        exec(cmdString, cb);
    }
});


const testApp = (app) => {
    return gulp.src([
        `./tests/${app}/*.test.js`,
    ]).pipe(mocha({
        timeout: 60000,
        ui: 'exports',
        reporter: 'spec',
    }));
};

gulp.task('test-wallet', () => {
    testApp('wallet');
});

gulp.task('test-mist', () => {
    testApp('mist');
});


gulp.task('default', ['mist']);
