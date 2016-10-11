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
var download = require('gulp-download-stream');
var flatten = require('gulp-flatten');
var tap = require("gulp-tap");
const shell = require('shelljs');
const mocha = require('gulp-spawn-mocha');
// const zip = require('gulp-zip');
// var zip = require('gulp-zip');
// var zip = require('gulp-jszip');
// var EasyZip = require('easy-zip').EasyZip;
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
var electronVersion = require('electron-prebuilt/package.json').version;
var gethVersion = '1.4.17';
var nodeUrls = {
    'mac-x64': {
        url: 'https://bintray.com/artifact/download/luclu/ethereum/geth-1.4.17-stable-5a6008e-darwin-10.6-amd64.tar.bz2',
        ext: 'tar'
    },
    'linux-x64': {
        url: 'https://bintray.com/artifact/download/luclu/ethereum/geth-1.4.17-stable-5a6008e-linux-amd64.tar.bz2',
        ext: 'tar',
    },
    'linux-ia32': {
        url: 'https://bintray.com/artifact/download/luclu/ethereum/geth-1.4.17-stable-5a6008e-linux-386.tar.bz2',
        ext: 'tar',
    },
    'win-x64': {
        url: 'https://bintray.com/artifact/download/luclu/ethereum/geth-1.4.17-stable-5a6008e-windows-4.0-amd64.exe.zip',
        ext: 'zip',
    },
    'win-ia32': {
        url: 'https://bintray.com/artifact/download/luclu/ethereum/geth-1.4.17-stable-5a6008e-windows-4.0-386.exe.zip',
        ext: 'zip',
    },
};

var packJson = require('./package.json');
var version = packJson.version;

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

// DOWNLOAD NODES

gulp.task('clean:nodes', function (cb) {
  return del([
    './nodes/geth/',
  ], cb);
});

gulp.task('downloadNodes', ['clean:nodes'], function() {
    let toDownload = [];

    _.each(nodeUrls, function(info, osArch) {
        // donwload nodes
        if (platformIsActive(osArch)) {
            toDownload.push({
                file: `geth_${gethVersion}_${osArch}.${info.ext}`,
                url: info.url,
            });
        }
    });

    return download(toDownload)
        .pipe(gulp.dest('./nodes/geth/'));
});



gulp.task('unzipNodes', ['downloadNodes'], function(done) {
    let nodeZips = fs.readdirSync('./nodes/geth');

    var streams = [];

    for (let zipFileName of nodeZips) {
        let match = zipFileName.match(/_(\w+\-\w+)\./);
        if (!match) {
            continue;
        }

        let osArch = match[1];

        let ret;

        shell.mkdir('-p', `./nodes/geth/${osArch}`);

        switch (path.extname(zipFileName)) {
            case '.zip':
                ret = shell.exec(`unzip -o ./nodes/geth/${zipFileName} -d ./nodes/geth/${osArch}`);
                break;
            case '.tar':
                ret = shell.exec(`tar -xf ./nodes/geth/${zipFileName} -C ./nodes/geth/${osArch}`);
                break;
            case '.bz2':
                ret = shell.exec(`tar -xf ./nodes/geth/${zipFileName} -C ./nodes/geth/${osArch}`);
                break;
            default:
                return done(new Error(`Don't know how to process: ${zipFileName}`));
        }

        if (0 !== ret.code) {
            console.error('Error unzipping ' + zipFileName);
            console.log(ret.stdout);
            console.error(ret.stderr);
            return done(ret.stderr);
        }
    }

    done();
});



gulp.task('renameNodes', ['unzipNodes'], function(done) {
    var streams = [];

    for (let osArch in nodeUrls) {
        let file;
        try {
            file = fs.readdirSync('./nodes/geth/' + osArch).pop();
        } catch (err) {
            console.warn(`Skipping ${osArch} node: ${err.message}`);
            continue;
        }

        const finalName = (0 <= osArch.indexOf('win') ? 'geth.exe' : 'geth');

        const originalPath = `./nodes/geth/${osArch}/${file}`,
            finalPath = `./nodes/geth/${osArch}/${finalName}`;

        let ret = shell.mv(originalPath, finalPath);

        if (0 !== ret.code) {
            console.error(`Error renaming ${originalPath}`);

            return done(ret.stderr);
        }

        ret = shell.exec(`chmod +x ${finalPath}`);

        if (0 !== ret.code) {
            console.error(`Error setting executable permission: ${finalPath}`);

            return done(ret.stderr);
        }
    }

    return done();
});




// CHECK FOR NODES

var nodeUpdateNeeded = false;
gulp.task('checkNodes', function(cb) {
    _.each(nodeUrls, (info, osArch) => {
        // check for zip file
        if (platformIsActive(osArch)) {
            const fileName = `geth_${gethVersion}_${osArch}.${info.ext}`;

            try {
                fs.accessSync(`./nodes/geth/${fileName}`, fs.R_OK);
            } catch (err) {
                nodeUpdateNeeded = true;
            }
        }        
    });

    cb();
});



// BUNLDE PROCESS

gulp.task('copy-app-source-files', ['checkNodes', 'clean:dist'], function() {

    // check if nodes are there
    if(nodeUpdateNeeded){
        console.error('YOUR NODES NEED TO BE UPDATED run $ gulp update-nodes');
        throw new Error('YOUR NODES NEED TO BE UPDATED run $ gulp update-nodes');
    }

    return gulp.src([
        './tests/**/*.*',
        './icons/'+ type +'/*',
        './modules/**/**/**/*',
        './sounds/*',
        './*.js',
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


gulp.task('copy-node-folder-files', ['checkNodes', 'clean:dist'], function(done) {
    // check if nodes are there
    if(nodeUpdateNeeded){
        console.error('YOUR NODES NEED TO BE UPDATED run $ gulp update-nodes');

        done(new Error('YOUR NODES NEED TO BE UPDATED run $ gulp update-nodes'));

        return;
    }

    var streams = [];

    _.each(nodeUrls, (info, osArch) => {
        if (platformIsActive(osArch)) {
            // copy eth node binaries
            streams.push(gulp.src([
                './nodes/eth/'+ osArch + '/*'
            ])
                .pipe(gulp.dest('./dist_'+ type +'/app/nodes/eth/' + osArch)));

            // copy geth node binaries
            streams.push(gulp.src([
                './nodes/geth/'+ osArch + '/*'
            ])
                .pipe(gulp.dest('./dist_'+ type +'/app/nodes/geth/' + osArch)));
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
        // TODO move mist interface too

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
              "nodes/geth/${os}-${arch}"
            ],
            mac: {
                target: [
                    "zip",
                    "dmg"
                ]
            },
            linux: {
                target: [
                    "zip",
                    "deb"
                ]
            },
            win: {
                target: [
                    "zip",
                    "squirrel"
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

    _.each(nodeUrls, (info, osArch) => {
        if (platformIsActive(osArch)) {
            switch (osArch) {
                case 'win-ia32':
                    shell.cp(path.join(distPath, 'win-ia32', `${applicationName} Setup ${version}-ia32.exe`), releasePath);
                    break;
                case 'win-x64':
                    shell.cp(path.join(distPath, 'win', `${applicationName} Setup ${version}.exe`), releasePath);
                    break;
                case 'mac-x64':
                    shell.cp(path.join(distPath, 'mac', `${applicationName}-${version}.dmg`), releasePath);
                    break;
                case 'linux-ia32':
                    shell.cp(path.join(distPath, `Mist-${version}-ia32.deb`), path.join(releasePath, `${applicationName}-${version}-ia32.deb`) );
                    break;
                case 'linux-x64':
                    shell.cp(path.join(distPath, `Mist-${version}.deb`), path.join(releasePath, `${applicationName}-${version}.deb`) );
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
        let sha = shell.exec(`shasum -a 256 "./dist_${type}/release/${file}"`);

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

// DOWNLOAD nodes
gulp.task('update-nodes', [
    'renameNodes'
]);
gulp.task('download-nodes', ['update-nodes']);

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
