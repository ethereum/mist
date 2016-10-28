"use strict";

var _ = require("underscore");
var path = require('path');
var gulp = require('gulp');
var exec = require('child_process').exec;
var del = require('del');
var replace = require('gulp-replace');
var runSeq = require('run-sequence');
var merge = require('merge-stream');
var rename = require("gulp-rename");
var flatten = require('gulp-flatten');
var tap = require("gulp-tap");
const shell = require('shelljs');
const mocha = require('gulp-spawn-mocha');
var minimist = require('minimist');
var fs = require('fs');
var rcedit = require('rcedit');
var syncRequest = require('sync-request');


var builder = require('electron-builder');

var options = minimist(process.argv.slice(2), {
    string: ['platform','walletSource'],
    default: {
        platform: 'all',
        walletSource: 'master'
    }
});


if(options.platform.indexOf(',') !== -1)
    options.platform = options.platform.replace(/ +/g,'').split(',');
else
    options.platform = options.platform.split(' ');


// CONFIG
var type = 'mist';
var filenameLowercase = 'mist';
var filenameUppercase = 'Mist';
var applicationName = 'Mist';
var electronVersion = require('electron/package.json').version;


var packJson = require('./package.json');
var version = packJson.version;

const osArchList = [
    'mac-x64',
    'linux-x64',
    'linux-ia32',
    'win-x64',
    'win-ia32'
];


console.log('You can select a platform like: --platform <mac|win|linux|all>');

console.log('App type:', type);
console.log('Mist version:', version);
console.log('Electron version:', electronVersion);

if(_.contains(options.platform, 'all')) {
    options.platform = ['win', 'linux', 'mac'];
}

console.log('Selected platform:', options.platform);


function platformIsActive(osArch) {
    for (let p of options.platform) {
        if (0 <= osArch.indexOf(p)) {
            return true;
        }
    }
    return false;
}



/// --------------------------------------------------------------

// TASKS
gulp.task('set-variables-mist', function () {
    type = 'mist';
    filenameLowercase = 'mist';
    filenameUppercase = 'Mist';
    applicationName = 'Mist';
});
gulp.task('set-variables-wallet', function () {
    type = 'wallet';
    filenameLowercase = 'ethereum-wallet';
    filenameUppercase = 'Ethereum-Wallet';
    applicationName = 'Ethereum Wallet';
});


gulp.task('clean:dist', function (cb) {
  return del([
    './dist_'+ type +'/**/*',
    './meteor-dapp-wallet',
  ], cb);
});


// BUNLDE PROCESS

gulp.task('copy-app-source-files', ['clean:dist'], function() {
    return gulp.src([
        './tests/**/*.*',
        './icons/'+ type +'/*',
        './modules/**/**/**/*',
        './sounds/*',
        './*.js',
        './clientBinaries.json',
        '!gulpfile.js'
        ], { base: './' })
        .pipe(gulp.dest('./dist_'+ type +'/app'));
});


gulp.task('copy-app-folder-files', ['copy-app-source-files'], function(done) {
    let ret = shell.exec(
        `cp -a ${__dirname}/node_modules ${__dirname}/dist_${type}/app/node_modules`
    );

    if (0 !== ret.code) {
        console.error(`Error symlinking node_modules`);

        return done(ret.stderr);
    }

    return done();
});


gulp.task('copy-build-folder-files', ['clean:dist', 'copy-app-folder-files'], function() {
    return gulp.src([
        './icons/'+ type +'/*',
        './interface/public/images/dmg-background.jpg',
        ], { base: './' })
        .pipe(flatten())
        .pipe(gulp.dest('./dist_'+ type +'/build'));
});


gulp.task('copy-node-folder-files', ['clean:dist'], function(done) {
    var streams = [];

    _.each(osArchList, (osArch) => {
        if (platformIsActive(osArch)) {
            // copy eth node binaries
            streams.push(gulp.src([
                './nodes/eth/'+ osArch + '/*'
            ])
                .pipe(gulp.dest('./dist_'+ type +'/app/nodes/eth/' + osArch)));
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




gulp.task('switch-production', ['copy-files'], function(cb) {
    fs.writeFileSync(__dirname+'/dist_'+ type +'/app/config.json', JSON.stringify({
        production: true,
        mode: type,
    }));

    cb();
});


gulp.task('bundling-interface', ['switch-production'], function(cb) {
    if(type === 'mist') {
        exec('cd interface && meteor-build-client ../dist_'+ type +'/app/interface -p ""', function (err, stdout, stderr) {
            console.log(stdout);

            cb(err);
        });
    }

    if(type === 'wallet') {
        if(options.walletSource === 'local') {
            console.log('Use local wallet at ../meteor-dapp-wallet/app');
            exec('cd interface/ && meteor-build-client ../dist_'+ type +'/app/interface/ -p "" &&'+
                 'cd ../../meteor-dapp-wallet/app && meteor-build-client ../../mist/dist_'+ type +'/app/interface/wallet -p ""', function (err, stdout, stderr) {
                console.log(stdout);

                cb(err);
            });

        } else {
            console.log('Pulling https://github.com/ethereum/meteor-dapp-wallet/tree/'+ options.walletSource +' "'+ options.walletSource +'" branch...');
            exec('cd interface/ && meteor-build-client ../dist_'+ type +'/app/interface/ -p "" &&'+
                 'cd ../dist_'+ type +'/ && git clone --depth 1 https://github.com/ethereum/meteor-dapp-wallet.git && cd meteor-dapp-wallet/app && meteor-build-client ../../app/interface/wallet -p "" && cd ../../ && rm -rf meteor-dapp-wallet', function (err, stdout, stderr) {
                console.log(stdout);

                cb(err);
            });
        }
    }
});


// needs to be copied, so the backend can use it
gulp.task('copy-i18n', ['bundling-interface'], function() {
    return gulp.src([
        './interface/i18n/*.*',
        './interface/project-tap.i18n'
        ], { base: './' })
        .pipe(gulp.dest('./dist_'+ type +'/app'));
});



gulp.task('build-dist', ['copy-i18n'], function(cb) {
    console.log('Bundling platforms: ', options.platform);

    var appPackageJson = _.extend({}, packJson, {
        name: applicationName.replace(/\s/, ''),
        productName: applicationName,
        description: applicationName,
        homepage: "https://github.com/ethereum/mist",
        build: {
            appId: "com.ethereum.mist." + type,
            "category": "public.app-category.productivity",
            asar: true,
            files: [
              "**/*",
              "!nodes",
              "build-dist.js",
            ],
            extraFiles: [
              "nodes/eth/${os}-${arch}",
            ],
            linux: {
                target: [
                    "zip",
                    "deb"
                ]
            },
            dmg: {
                background: "../build/dmg-background.jpg",
                "icon-size": 128,
                "contents": [{
                    "x": 441,
                    "y": 448,
                    "type": "link",
                    "path": "/Applications"
                },
                {
                    "x": 441,
                    "y": 142,
                    "type": "file"
                }]
            }
        },
        directories: {
            buildResources: "../build",
            app: ".",
            output: "../dist",
        },
    });

    fs.writeFileSync(
        path.join(__dirname, 'dist_' + type, 'app', 'package.json'),
        JSON.stringify(appPackageJson, null, 2),
        'utf-8'
    );

    // Copy build script
    shell.cp(
        path.join(__dirname, 'scripts', 'build-dist.js'),
        path.join(__dirname, 'dist_' + type, 'app')
    );

    // run build script
    var oses = '--' + options.platform.join(' --');

    var ret = shell.exec(`./build-dist.js --type ${type} ${oses}`, {
        cwd: path.join(__dirname, 'dist_' + type, 'app'),
    });

    if (0 !== ret.code) {
        console.error(ret.stdout);
        console.error(ret.stderr);

        return cb(new Error('Error building distributables'));
    } else {
        console.log(ret.stdout);

        cb();
    }
});



gulp.task('release-dist', ['build-dist'], function(done) {
    const distPath = path.join(__dirname, `dist_${type}`, 'dist'),
        releasePath = path.join(__dirname, `dist_${type}`, 'release');

    shell.rm('-rf', releasePath);
    shell.mkdir('-p', releasePath);

    const appNameHypen = applicationName.replace(/\s/, '-');
    const appNameNoSpace = applicationName.replace(/\s/, '');
    const versionDashed = version.replace(/\./g, '-');
    
    _.each(osArchList, (osArch) => {
        if (platformIsActive(osArch)) {
            switch (osArch) {
                case 'win-ia32':
                    shell.cp(path.join(distPath, 'win-ia32', `${applicationName} Setup ${version}-ia32.exe`),
                            path.join(releasePath, `${appNameHypen}-win32-${versionDashed}.exe`));
                    break;
                case 'win-x64':
                    shell.cp(path.join(distPath, 'win', `${applicationName} Setup ${version}.exe`),
                            path.join(releasePath, `${appNameHypen}-win64-${versionDashed}.exe`));
                    break;
                case 'mac-x64':
                    shell.cp(path.join(distPath, 'mac', `${applicationName}-${version}.dmg`),
                            path.join(releasePath, `${appNameHypen}-macosx-${versionDashed}.dmg`));
                    break;
                case 'linux-ia32':
                    shell.cp(path.join(distPath, `${appNameNoSpace}-${version}-ia32.deb`),
                            path.join(releasePath, `${appNameHypen}-linux32-${versionDashed}.deb`) );
                    shell.cp(path.join(distPath, `${appNameNoSpace}-${version}-ia32.zip`),
                            path.join(releasePath, `${appNameHypen}-linux32-${versionDashed}.zip`) );
                    break;
                case 'linux-x64':
                    shell.cp(path.join(distPath, `${appNameNoSpace}-${version}.deb`),
                            path.join(releasePath, `${appNameHypen}-linux64-${versionDashed}.deb`) );
                    shell.cp(path.join(distPath, `${appNameNoSpace}-${version}.zip`),
                            path.join(releasePath, `${appNameHypen}-linux64-${versionDashed}.zip`) );
                    break;
            }
        }
    });

    done();
});



gulp.task('get-release-checksums', function(done) {
    const releasePath = `./dist_${type}/release`;

    let files = fs.readdirSync(releasePath);

    for (let file of files) {
        let sha = shell.exec(`shasum -a 256 "${file}"`, { cwd:releasePath });

        if (0 !== sha.code) {
            return done(new Error('Error executing shasum: ' + sha.stderr));
        }
    }
});


gulp.task('download-signatures', function(){
    var signatures = {},
    getFrom4byteAPI = function(url){
        console.log('Requesting ', url);
        var res = syncRequest('GET', url);
        if (res.statusCode == 200) {
            var responseData = JSON.parse(res.getBody('utf8'));
            _.map(responseData.results, function(e){
                if (!!signatures[e.hex_signature]) {
                    signatures[e.hex_signature].push(e.text_signature);
                }
                else {
                    signatures[e.hex_signature] = [e.text_signature];
                }
            });
            responseData.next && getFrom4byteAPI(responseData.next);
        }
    };

    getFrom4byteAPI('https://www.4byte.directory/api/v1/signatures/');
    fs.writeFileSync('interface/client/lib/signatures.js', "window.SIGNATURES = " + JSON.stringify(signatures, null, '\t') + ";");
});


gulp.task('taskQueue', [
    'release-dist'
]);

// MIST task
gulp.task('mist', function(cb) {
    runSeq('set-variables-mist', 'taskQueue', cb);
});

// WALLET task
gulp.task('wallet', function(cb) {
    runSeq('set-variables-wallet', 'taskQueue', cb);
});

// WALLET task
gulp.task('mist-checksums', function(cb) {
    runSeq('set-variables-mist', 'get-release-checksums', cb);
});
gulp.task('wallet-checksums', function(cb) {
    runSeq('set-variables-wallet', 'get-release-checksums', cb);
});



gulp.task('test-wallet', function() {
    return gulp.src([
        './test/wallet/*.test.js'
    ])
    .pipe(mocha({
        timeout: 60000,
        ui: 'exports',
        reporter: 'spec'
    }));
});



gulp.task('default', ['mist']);
