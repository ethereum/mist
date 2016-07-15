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
var decompress = require('gulp-decompress');
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
var electronVersion = '1.2.5';
var gethVersion = '1.4.7';
var nodeUrls = {
    'darwin-x64': 'https://github.com/ethereum/go-ethereum/releases/download/v1.4.7/geth-OSX-2016061509421-1.4.7-667a386.zip',
    'linux-x64': 'https://github.com/ethereum/go-ethereum/releases/download/v1.4.7/geth-Linux64-20160615125500-1.4.7-667a386.tar.bz2',
    'win32-x64': 'https://github.com/ethereum/go-ethereum/releases/download/v1.4.7/Geth-Win64-20160615094032-1.4.7-667a386.zip',
    'linux-ia32': 'https://bintray.com/karalabe/ethereum/download_file?file_path=geth-1.4.7-stable-667a386-linux-386.tar.bz2',
    'win32-ia32': 'https://bintray.com/karalabe/ethereum/download_file?file_path=geth-1.4.7-stable-667a386-windows-4.0-386.exe.zip'
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

gulp.task('downloadNodes', ['clean:nodes'], function(done) {
    var streams = [];

    _.each(nodeUrls, function(nodeUrl, os){

        //var destPath = (os === 'darwin-x64')
          //  ? path +'/'+ filenameUppercase +'.app/Contents/Frameworks/node'
            //: path +'/resources/node';


        // donwload nodes
        streams.push(download(nodeUrl)
            .pipe(gulp.dest('./nodes/geth/')));

    });

    return merge.apply(null, streams);
});

gulp.task('unzipNodes', ['downloadNodes'], function(done) {
    var streams = [];

    _.each(nodeUrls, function(nodeUrl, os){

        var fileName = nodeUrl.substr(nodeUrl.lastIndexOf('/'));

        // unzip nodes
        streams.push(gulp.src('./nodes/geth'+ fileName)
            .pipe(decompress({strip: 1}))
            .pipe(gulp.dest('./nodes/geth/'+ os)));

    });

    return merge.apply(null, streams);
});

gulp.task('renameNodes', ['unzipNodes'], function(done) {
    var streams = [];

    _.each(nodeUrls, function(nodeUrl, os){

        var fileName = nodeUrl.substr(nodeUrl.lastIndexOf('/')).replace('download_file?file_path=','').replace('.tar.bz2','').replace('.zip','');

        // unzip nodes
        if(os === 'linux-ia32' || os === 'win32-ia32') {
            console.log(fileName);
            var task = gulp.src('./nodes/geth/'+ os + fileName);

            if(os === 'linux-ia32')
                task.pipe(rename('geth/'+ os + '/geth'));
            if(os === 'win32-ia32')
                task.pipe(rename('geth/'+ os + '/geth.exe'));

            task.pipe(gulp.dest('./nodes/'));

            streams.push(task);
        }

    });

    return merge.apply(null, streams);
});

gulp.task('renameNodesDeleteOld', ['renameNodes'], function (cb) {
  return del([
    './nodes/geth/linux-ia32/'+ nodeUrls['linux-ia32'].substr(nodeUrls['linux-ia32'].lastIndexOf('/')).replace('download_file?file_path=','').replace('.tar.bz2','').replace('.zip',''),
    './nodes/geth/win32-ia32/'+ nodeUrls['win32-ia32'].substr(nodeUrls['linux-ia32'].lastIndexOf('/')).replace('download_file?file_path=','').replace('.tar.bz2','').replace('.zip',''),
  ], cb);
});

// CHECK FOR NODES

var updatedNeeded = true;
gulp.task('checkNodes', function() {
    return gulp.src('./nodes/geth/*.{zip,tar.bz2}')
    .pipe(tap(function(file, t) {
        if(!!~file.path.indexOf('-'+ gethVersion +'-')) {
            updatedNeeded = false;
        }
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


gulp.task('copy-node-folder-files', ['checkNodes', 'clean:dist'], function() {
    // check if nodes are there
    if(updatedNeeded){
        console.error('YOUR NODES NEED TO BE UPDATED run $ gulp update-nodes');
        throw new Error('YOUR NODES NEED TO BE UPDATED run $ gulp update-nodes');
    }

    var streams = [];

    nodeVersions.map(function(os){
        // copy eth node binaries
        streams.push(gulp.src([
            './nodes/eth/'+ os + '/*'
            ])
            .pipe(gulp.dest('./dist_'+ type +'/app')));

        // copy geth node binaries
        streams.push(gulp.src([
            './nodes/geth/'+ os + '/*'
            ])
            .pipe(gulp.dest('./dist_'+ type +'/app')));
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
              "!nodes"
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

    var oses = '--' + options.platform.join(' --');

    var ret = shell.exec(path.join(__dirname, 'node_modules/.bin/build ' + oses), {
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

    // builder.build({
    //     targets: Platform.MAC.createTarget(),
    //     devMetadata: {
    //         build: {
    //             appId: "com.ethereum.mist." + type,
    //             "app-category-type": "public.app-category.productivity",
    //             asar: true,
    //             extraResources: [
    //                 "./dist_" + type + "/node/**/*"
    //             ],
    //             dmg: {
    //                 background: "./dist_" + type + "/build/bg-homestead.jpg"
    //             }
    //         },
    //         directories: {
    //             buildResources: "./dist_" + type + "/build",
    //             app: "./dist_" + type + "/app",
    //             output: "./dist_" + type + "/dist",
    //         },
    //     },
    // })
    //   .then(() => {
    //     cb();
    //   })
    //   .catch(cb);
});



// gulp.task('create-binaries', ['copy-i18n'], function(cb) {
//     console.log('Bundling platforms: ', nodeVersions);

//     packager({
//         dir: './dist_'+ type +'/app/',
//         out: './dist_'+ type +'/',
//         name: filenameUppercase,
//         platform: options.platform.join(','),
//         arch: 'all',
//         icon: './icons/'+ type +'/icon.icns',
//         version: electronVersion,
//         'app-version': version,
//         'build-version': electronVersion,
//         // DO AFTER: codesign --deep --force --verbose --sign "5F515C07CEB5A1EC3EEB39C100C06A8C5ACAE5F4" Ethereum-Wallet.app
//         //'sign': '3rd Party Mac Developer Application: Stiftung Ethereum (3W6577R383)',
//         'app-bundle-id': 'com.ethereum.'+ type,
//         'helper-bundle-id': 'com.ethereum.'+ type + '.helper',
//         //'helper-bundle-id': 'com.github.electron.helper',
//         // cache: './dist_'+ type +'/', // directory of cached electron downloads. Defaults to '$HOME/.electron'
//         ignore: '', //do not copy files into App whose filenames regex .match this string
//         prune: true,
//         overwrite: true,
//         asar: true,
//         // sign: '',
//         'version-string': {
//             CompanyName: 'Stiftung Ethereum',
//             // LegalCopyright
//             // FileDescription
//             // OriginalFilename
//             ProductName: applicationName
//             // InternalName: 
//         }
//     }, function(){
//         setTimeout(function(){
//             cb();
//         }, 1000)
//     });
// });

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


gulp.task('rename-folders', ['change-files'], function(done) {
    var count = 0;
    var called = false;
    nodeVersions.forEach(function(os){

        var path = createNewFileName(os);

        fs.renameSync('./dist_'+ type +'/'+ filenameUppercase +'-'+ os, path);

        // change icon on windows
        if(os.indexOf('win32') !== -1) {
            rcedit(path +'/'+ filenameUppercase +'.exe', {
                'file-version': version,
                'product-version': version,
                'icon': './icons/'+ type +'/icon.ico'
            }, function(){
                if(!called && nodeVersions.length === count) {
                    done();
                    called = true;
                }
            });
        }


        //var zip5 = new EasyZip();
        //zip5.zipFolder(path, function(){
        //    zip5.writeToFile(path +'.zip'); 
        //});


        count++;

        if(!called && nodeVersions.length === count) {
            done();
            called = true;
        }
    });
});


gulp.task('zip', ['rename-folders'], function () {
    var streams = nodeVersions.map(function(os){
        var stream,
            name = filenameUppercase +'-'+ os +'-'+ version.replace(/\./g,'-');

        // TODO doesnt work!!!!!
        stream = gulp.src([
            './dist_'+ type +'/'+ name + '/**/*'
            ])
            .pipe(zip({
                name: name + ".zip",
                outpath: './dist_'+ type +'/'
            }));
            // .pipe(zip(name +'.zip'))
            // .pipe(gulp.dest('./dist_'+ type +'/'));

        return stream;
    });


    return merge.apply(null, streams);
});



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
    'renameNodesDeleteOld'
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

