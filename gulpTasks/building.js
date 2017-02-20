const _ = require('underscore');
const del = require('del');
const exec = require('child_process').exec;
const fs = require('fs');
const gulp = require('gulp');
const merge = require('merge-stream');
const options = require('../gulpfile.js').options;
const path = require('path');
const shell = require('shelljs');
const version = require('../package.json').version;


const type = options.type;
const applicationName = (options.wallet) ? 'Ethereum Wallet' : 'Mist';
const osArchList = [
    'mac',
    'linux',
    'win',
];


gulp.task('clean-dist', (cb) => {
    return del([
        `./dist_${type}/**/*`,
        './meteor-dapp-wallet',
    ], cb);
});


gulp.task('copy-app-source-files', () => {
    return gulp.src([
        './main.js',
        './clientBinaries.json',
        './modules/**',
        './tests/**/*.*',
        '!./tests/wallet/*',
        `./icons/${type}/*`,
        './sounds/*',
        // 'customProtocols.js', // TODO is this needed?
    ], {
        base: './'
    })
    .pipe(gulp.dest(`./dist_${type}/app`));
});


gulp.task('copy-app-folder-files', (done) => {  // TODO fabian, do you need this for your local web3.js simlinking?
    const ret = shell.exec(
        // `cp -a ${__dirname}/node_modules ${__dirname}/dist_${type}/app/node_modules` // electron-builder should already do this now
    );

    if (ret.code !== 0) {
        console.error('Error symlinking node_modules');

        return done(ret.stderr);
    }

    return done();
});


gulp.task('copy-build-folder-files', () => {
    return gulp.src([
        `./icons/${type}/*`,
        './interface/public/images/dmg-background.jpg',
    ])
    .pipe(gulp.dest(`./dist_${type}/build`));
});


gulp.task('copy-node-folder-files', () => {

    console.log(options)
    const streams = [];

    _.each(osArchList, (osArch) => {
        if (options[osArch]) {
            // copy eth node binaries
            streams.push(gulp.src([
                `./nodes/eth/${osArch}-x64/*`,
            ])
            .pipe(gulp.dest(`../dist_${type}/app/nodes/eth/${osArch}`)));
        }
    });

    return merge(...streams);
});


gulp.task('switch-production', (cb) => {
    fs.writeFileSync(`./dist_${type}/app/config.json`, JSON.stringify({
        production: true,
        mode: type,
    }));

    cb();
});


gulp.task('bundling-interface', (cb) => {
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
gulp.task('copy-i18n', () => {
    return gulp.src([
        './interface/i18n/*.*',
        './interface/project-tap.i18n',
    ], {
        base: './'
    })
    .pipe(gulp.dest(`./dist_${type}/app`));
});


gulp.task('build-dist', (cb) => {
    const appPackageJson = _.extend({}, require('../package.json'), {  // eslint-disable-line global-require
        name: applicationName.replace(/\s/, ''),
        productName: applicationName,
        description: applicationName,
        homepage: 'https://github.com/ethereum/mist',
        build: {
            appId: `com.ethereum.${type}`,
            category: 'public.app-category.productivity',
            asar: true,
            // files: [
            //     '**/*',
            // ],
            // extraFiles: [  // TODO do we want to bundle eth?
            //                   (for some reason it disappeared in v0.8.9)
            //     'nodes/eth/${os}-${arch}', // eslint-disable-line no-template-curly-in-string
            // ],
            directories: {
                buildResources: '../build',
                output: '../dist',
            },
            linux: {
                target: [
                    'zip',
                    'deb',
                ],
            },
            win: {
                target: [
                    'zip',
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
    });

    fs.writeFileSync(
        path.join(__dirname, `../dist_${type}`, 'app', 'package.json'),
        JSON.stringify(appPackageJson, null, 2),
        'utf-8'
    );

    // Copy build script
    shell.cp(
        path.join(__dirname, '../scripts', 'build-dist.js'),
        path.join(__dirname, `../dist_${type}`, 'app')
    );

    // TODO rename files before packaging

    // run build script
    let oses = _.keys(_.pick(_.pick(options, osArchList), (value) => { return value; }));
    if (_.isEmpty(oses)) oses = osArchList;

    const osesString = `--${oses.join(' --')}`;

    const ret = shell.exec(`./build-dist.js --type ${type} ${osesString}`, {
        cwd: path.join(__dirname, `../dist_${type}`, 'app'),
    });

    if (ret.code !== 0) {
        console.error(ret.stdout);

        return cb(new Error('Error building distributables'));
    }

    return cb();
});


gulp.task('release-dist', (done) => {
    const distPath = path.join(__dirname, `../dist_${type}`, 'dist');
    const releasePath = path.join(__dirname, `../dist_${type}`, 'release');

    shell.rm('-rf', releasePath);
    shell.mkdir('-p', releasePath);

    const appNameHypen = applicationName.replace(/\s/, '-');
    const appNameNoSpace = applicationName.replace(/\s/, '');
    const versionDashed = version.replace(/\./g, '-');

    const cp = (inputPath, outputPath) => {
        shell.cp(path.join(distPath, inputPath), path.join(releasePath, outputPath));
    };

    _.each(osArchList, (osArch) => {
        if (options[osArch]) {
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


gulp.task('build-nsis', (cb) => {
    const typeString = `-DTYPE=${type}`;
    const appNameString = `-DAPPNAME=${applicationName.replace(/\s/, '-')}`;
    const versionParts = version.split('.');
    const versionString = `-DVERSIONMAJOR=${versionParts[0]} -DVERSIONMINOR=${versionParts[1]} -DVERSIONBUILD=${versionParts[2]}`;
    const cmdString = `makensis -V3 ${versionString} ${typeString} ${appNameString} scripts/windows-installer.nsi`;
    exec(cmdString, cb);
});
