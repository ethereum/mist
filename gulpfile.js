"use strict";

var _ = require("underscore");
var path = require('path');
var gulp = require('gulp');
var exec = require('child_process').exec;
var del = require('del');
var replace = require('gulp-replace');
var runSeq = require('run-sequence');
var packager = require('electron-packager');
var shell = require('shelljs');
var merge = require('merge-stream');
var rename = require("gulp-rename");
var download = require('gulp-download-stream');
var flatten = require('gulp-flatten');
var tap = require("gulp-tap");
const mocha = require('gulp-spawn-mocha');
// const zip = require('gulp-zip');
// var zip = require('gulp-zip');
// var zip = require('gulp-jszip');
// var EasyZip = require('easy-zip').EasyZip;
var minimist = require('minimist');
var fs = require('fs');
var rcedit = require('rcedit');


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
var gethVersion = '1.4.10';
var nodeUrls = {
    'darwin-x64': 'https://github.com/ethereum/go-ethereum/releases/download/v1.4.10/geth-OSX-20160716155225-1.4.10-5f55d95.zip',
    'linux-x64': 'https://github.com/ethereum/go-ethereum/releases/download/v1.4.10/geth-Linux64-20160716160600-1.4.10-5f55d95.tar.bz2',
    'win32-x64': 'https://github.com/ethereum/go-ethereum/releases/download/v1.4.10/Geth-Win64-20160716155900-1.4.10-5f55d95.zip',
    'linux-ia32': 'https://bintray.com/karalabe/ethereum/download_file?file_path=geth-1.4.10-stable-5f55d95-linux-386.tar.bz2',
    'win32-ia32': 'https://bintray.com/karalabe/ethereum/download_file?file_path=geth-1.4.10-stable-5f55d95-windows-4.0-386.exe.zip'
};

var nodeVersions = [];
var packJson = require('./package.json');
var version = packJson.version;

console.log('You can select a platform like: --platform (all or mac or win or linux)');

console.log('Mist version:', version);
console.log('Electron version:', electronVersion);

if(_.contains(options.platform, 'win')) {
    nodeVersions.push('win32-ia32');
    nodeVersions.push('win32-x64');
}

if(_.contains(options.platform, 'linux')) {
    nodeVersions.push('linux-ia32');
    nodeVersions.push('linux-x64');
}

if(_.contains(options.platform, 'mac')) {
    nodeVersions.push('darwin-x64');
}

if(_.contains(options.platform, 'all')) {
    options.platform = ['win', 'mac', 'linux'];

    nodeVersions = [
        'darwin-x64',
        // 'linux-arm',
        'linux-ia32',
        'linux-x64',
        'win32-ia32',
        'win32-x64'
    ];
}


// Helpers
var createNewFileName = function(os) {
    var newOs;
    if(os.indexOf('win32') !== -1) {
        newOs = os.replace('win32-ia32','win32').replace('win32-x64','win64');
    }
    if(os.indexOf('darwin') !== -1) {
        newOs = 'macosx';
    }
    if(os.indexOf('linux') !== -1) {
        newOs = os.replace('linux-x64','linux64').replace('linux-ia32','linux32');
    }
    return './dist_'+ type +'/'+ filenameUppercase +'-'+ newOs + '-'+ version.replace(/\./g,'-');
};



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

    _.each(nodeUrls, function(url, osArch) {
        let ext = (0 <= osArch.indexOf('linux') ? '.tar.bz2' : '.zip');

        // donwload nodes
        if (osArch.indexOf(options.platform) !== -1 || options.platform == 'all') {
            toDownload.push({
                file: `geth-${gethVersion}_${osArch}_${ext}`,
                url: url,
            });
        }

        toDownload.push({
            file: `geth-${gethVersion}_${osArch}_${ext}`,
            url: url,
        });
    });

    return download(toDownload)
        .pipe(gulp.dest('./nodes/geth/'));
});

gulp.task('unzipNodes', ['downloadNodes'], function(done) {
    let nodeZips = fs.readdirSync('./nodes/geth');

    var streams = [];

    for (let zipFileName of nodeZips) {
        let match = zipFileName.match(/_(\w+\-\w+)_/);
        if (!match) {
            continue;
        }

        let osArch = match[1];

        let ret;

        shell.mkdir('-p', `./nodes/geth/${osArch}`);

        if (0 <= osArch.indexOf('linux')) {            
            ret = shell.exec(`tar -xzf ./nodes/geth/${zipFileName} -C ./nodes/geth/${osArch}`);

        } else {
            ret = shell.exec(`unzip -o ./nodes/geth/${zipFileName} -d ./nodes/geth/${osArch}`);
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
        var file = fs.readdirSync('./nodes/geth/' + osArch).pop();

        var finalName = (0 <= osArch.indexOf('win32') ? 'geth.exe' : 'geth');

        let ret = shell.mv(`./nodes/geth/${osArch}/${file}`, `./nodes/geth/${osArch}/${finalName}`);

        if (0 !== ret.code) {
            console.error(`Error renaming ${file}`);

            return done(ret.stderr);
        }
    }

    return done();
});


// CHECK FOR NODES

var nodeUpdateNeeded = false;
gulp.task('checkNodes', function() {
    return gulp.src('./nodes/geth/*.{zip,tar.bz2}', { read: false })
    .pipe(tap(function(file, t) {
        nodeUpdateNeeded = 
            nodeUpdateNeeded || (0 > file.path.indexOf(gethVersion));
    }))
    .pipe(gulp.dest('./nodes/geth/'));
});


// BUNLDE PROCESS

gulp.task('copy-app-folder-files', ['clean:dist'], function() {

    return gulp.src([
        './tests/**/*.*',
        './icons/'+ type +'/*.*',
        './modules/**/*.*',
        './node_modules/**/*.*',
        './sounds/*.*',
        './*.js',
        '!gulpfile.js'
        ], { base: './' })
        .pipe(gulp.dest('./dist_'+ type +'/app'));
});


gulp.task('copy-build-folder-files', ['clean:dist', 'copy-app-folder-files'], function() {
    return gulp.src([
        './icons/'+ type +'/*.*',
        './interface/public/images/bg-homestead.jpg',
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

    nodeVersions.map(function(os){
        let destOs = os.replace('darwin', 'mac');

        // copy eth node binaries
        streams.push(gulp.src([
            './nodes/eth/'+ os + '/eth*'
        ])
            .pipe(gulp.dest('./dist_'+ type +'/app/nodes/eth/' + destOs)));

        // copy geth node binaries
        streams.push(gulp.src([
            './nodes/geth/'+ os + '/geth*'
        ])
            .pipe(gulp.dest('./dist_'+ type +'/app/nodes/geth/' + destOs)));
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
            // console.log(stdout);
            console.log(stderr);

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
                console.log(stderr);

                cb(err);
            });

        } else {
            console.log('Pulling https://github.com/ethereum/meteor-dapp-wallet/tree/'+ options.walletSource +' "'+ options.walletSource +'" branch...');
            exec('cd interface/ && meteor-build-client ../dist_'+ type +'/app/interface/ -p "" &&'+
                 'cd ../dist_'+ type +'/ && git clone --depth 1 https://github.com/ethereum/meteor-dapp-wallet.git && cd meteor-dapp-wallet/app && meteor-build-client ../../app/interface/wallet -p "" && cd ../../ && rm -rf meteor-dapp-wallet', function (err, stdout, stderr) {
                console.log(stdout);
                console.log(stderr);

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
        productName: applicationName,
        description: applicationName,
        homepage: "https://github.com/ethereum/mist",       
        build: {
            appId: "com.ethereum.mist." + type,
            "app-category-type": "public.app-category.productivity",
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
            dmg: {
                background: "../build/bg-homestead.jpg"
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

// FILE RENAMING

// gulp.task('change-files', ['create-binaries'], function() {
//     var streams = [];

//     nodeVersions.map(function(os){
//         var path = './dist_'+ type +'/'+ filenameUppercase +'-'+ os;

//         // change version file
//         streams.push(gulp.src([
//             path +'/version'
//             ])
//             .pipe(replace(electronVersion, version))
//             .pipe(gulp.dest(path +'/')));

//         // copy license file
//         streams.push(gulp.src([
//             './LICENSE'
//             ])
//             .pipe(gulp.dest(path +'/')));


//         // copy authors file
//         streams.push(gulp.src([
//             './AUTHORS'
//             ])
//             .pipe(gulp.dest(path +'/')));

//         // copy and rename readme
//         streams.push(gulp.src([
//             './Wallet-README.txt'
//             ], { base: './' })
//             .pipe(rename(function (path) {
//                 path.basename = "README";
//             }))
//             .pipe(gulp.dest(path + '/')));
//     });


//     return merge.apply(null, streams);
// });


//gulp.task('cleanup-files', ['change-files'], function (cb) {
//  return del(['./dist_'+ type +'/**/Wallet-README.txt'], cb);
//});


// gulp.task('rename-folders', ['change-files'], function(done) {
//     var count = 0;
//     var called = false;
//     nodeVersions.forEach(function(os){

//         var path = createNewFileName(os);

//         fs.renameSync('./dist_'+ type +'/'+ filenameUppercase +'-'+ os, path);

//         // change icon on windows
//         if(os.indexOf('win32') !== -1) {
//             rcedit(path +'/'+ filenameUppercase +'.exe', {
//                 'file-version': version,
//                 'product-version': version,
//                 'icon': './icons/'+ type +'/icon.ico'
//             }, function(){
//                 if(!called && nodeVersions.length === count) {
//                     done();
//                     called = true;
//                 }
//             });
//         }


//         //var zip5 = new EasyZip();
//         //zip5.zipFolder(path, function(){
//         //    zip5.writeToFile(path +'.zip'); 
//         //});


//         count++;

//         if(!called && nodeVersions.length === count) {
//             done();
//             called = true;
//         }
//     });
// });


// gulp.task('zip', ['rename-folders'], function () {
//     var streams = nodeVersions.map(function(os){
//         var stream,
//             name = filenameUppercase +'-'+ os +'-'+ version.replace(/\./g,'-');

//         // TODO doesnt work!!!!!
//         stream = gulp.src([
//             './dist_'+ type +'/'+ name + '/**/*'
//             ])
//             .pipe(zip({
//                 name: name + ".zip",
//                 outpath: './dist_'+ type +'/'
//             }));
//             // .pipe(zip(name +'.zip'))
//             // .pipe(gulp.dest('./dist_'+ type +'/'));

//         return stream;
//     });


//     return merge.apply(null, streams);
// });



gulp.task('getChecksums', [], function(done) {
    var count = 0;
    nodeVersions.forEach(function(os){

        var path = createNewFileName(os) + '.zip';

        // spit out sha256 checksums
        var fileName = path.replace('./dist_'+ type +'/', '');

        var sha = shell.exec('shasum -a 256 ' + path);

        if (0 !== sha.code) {
            throw new Error('Error executing shasum');
        }

        console.log('SHA256 '+ fileName +': '+ sha.stdout.replace(path, ''));


        count++;
        if(nodeVersions.length === count) {
            done();
        }
    });
});



gulp.task('taskQueue', [
    'build-dist'
    // 'zip',
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
    runSeq('set-variables-mist', 'getChecksums', cb);
});
gulp.task('wallet-checksums', function(cb) {
    runSeq('set-variables-wallet', 'getChecksums', cb);
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

