"use strict";

var _ = require("underscore");
var gulp = require('gulp');
var exec = require('child_process').exec;
var del = require('del');
var replace = require('gulp-replace');
var packager = require('electron-packager');
var spawn = require('child_process').spawn;
var merge = require('merge-stream');
var rename = require("gulp-rename");
var download = require('gulp-download-stream');
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
var gethVersion = '1.4.10';
var nodeUrls = {
    'darwin-x64': 'https://github.com/ethereum/go-ethereum/releases/download/v1.4.10/geth-OSX-20160716155225-1.4.10-5f55d95.zip',
    'linux-x64': 'https://github.com/ethereum/go-ethereum/releases/download/v1.4.10/geth-Linux64-20160716160600-1.4.10-5f55d95.tar.bz2',
    'win32-x64': 'https://github.com/ethereum/go-ethereum/releases/download/v1.4.10/Geth-Win64-20160716155900-1.4.10-5f55d95.zip',
    'linux-ia32': 'https://bintray.com/karalabe/ethereum/download_file?file_path=geth-1.4.10-stable-5f55d95-linux-386.tar.bz2',
    'win32-ia32': 'https://bintray.com/karalabe/ethereum/download_file?file_path=geth-1.4.10-stable-5f55d95-windows-4.0-386.exe.zip'
};

var osVersions = [];
var packJson = require('./package.json');
var version = packJson.version;

console.log('You can select a platform like: --platform (all or darwin or win32 or linux)');

console.log('Mist version:', version);
console.log('Electron version:', electronVersion);

if(_.contains(options.platform, 'win32')) {
    osVersions.push('win32-ia32');
    osVersions.push('win32-x64');
}

if(_.contains(options.platform, 'linux')) {
    osVersions.push('linux-ia32');
    osVersions.push('linux-x64');
}

if(_.contains(options.platform, 'darwin')) {
    osVersions.push('darwin-x64');
}

if(_.contains(options.platform, 'all')) {
    osVersions = [
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
            ret = shell.exec(`tar -xf ./nodes/geth/${zipFileName} -C ./nodes/geth/${osArch}`);

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
        let file;
        try {
            file = fs.readdirSync('./nodes/geth/' + osArch).pop();
        } catch (err) {
            console.warn(`Skipping ${osArch} node: ${err.message}`);
            continue;
        }

        const finalName = (0 <= osArch.indexOf('win32') ? 'geth.exe' : 'geth');

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
    return gulp.src('./nodes/geth/*.{zip,tar.bz2}', { read: false })
        .pipe(tap(function(file, t) {
            nodeUpdateNeeded = 
                nodeUpdateNeeded || (0 > file.path.indexOf(gethVersion));
        }))
    .pipe(gulp.dest('./nodes/geth/'));
});


// BUNLDE PROCESS

gulp.task('copy-files', ['checkNodes', 'clean:dist'], function() {

    // check if nodes are there
    if(nodeUpdateNeeded){
        console.error('YOUR NODES NEED TO BE UPDATED run $ gulp update-nodes');
        throw new Error('YOUR NODES NEED TO BE UPDATED run $ gulp update-nodes');
    }

    return gulp.src([
        './tests/**/*.*',
        './modules/**/*.*',
        './node_modules/**/*.*',
        './sounds/*.*',
        './icons/'+ type +'/*.*',
        './*.*',
        '!./interface/**/*.*',
        '!./geth',
        '!./geth.exe',
        '!./Wallet-README.txt'
        ], { base: './' })
        .pipe(gulp.dest('./dist_'+ type +'/app'));
});

gulp.task('switch-production', ['clean:dist', 'copy-files'], function(cb) {
    fs.writeFileSync(__dirname+'/dist_'+ type +'/app/config.json', JSON.stringify({
        production: true,
        mode: type,
    }));

    cb();
});


gulp.task('bundling-interface', ['clean:dist', 'copy-files'], function(cb) {
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
gulp.task('copy-i18n', ['copy-files', 'bundling-interface'], function() {
    return gulp.src([
        './interface/i18n/*.*',
        './interface/project-tap.i18n'
        ], { base: './' })
        .pipe(gulp.dest('./dist_'+ type +'/app'));
});

gulp.task('create-binaries', ['copy-i18n'], function(cb) {
    console.log('Bundling platforms: ', osVersions);

    packager({
        dir: './dist_'+ type +'/app/',
        out: './dist_'+ type +'/',
        name: filenameUppercase,
        platform: options.platform.join(','),
        arch: 'all',
        icon: './icons/'+ type +'/icon.icns',
        version: electronVersion,
        'app-version': version,
        'build-version': electronVersion,
        // DO AFTER: codesign --deep --force --verbose --sign "5F515C07CEB5A1EC3EEB39C100C06A8C5ACAE5F4" Ethereum-Wallet.app
        //'sign': '3rd Party Mac Developer Application: Stiftung Ethereum (3W6577R383)',
        'app-bundle-id': 'com.ethereum.'+ type,
        'helper-bundle-id': 'com.ethereum.'+ type + '.helper',
        //'helper-bundle-id': 'com.github.electron.helper',
        // cache: './dist_'+ type +'/', // directory of cached electron downloads. Defaults to '$HOME/.electron'
        ignore: '', //do not copy files into App whose filenames regex .match this string
        prune: true,
        overwrite: true,
        asar: true,
        // sign: '',
        'version-string': {
            CompanyName: 'Stiftung Ethereum',
            // LegalCopyright
            // FileDescription
            // OriginalFilename
            ProductName: applicationName
            // InternalName: 
        }
    }, function(){
        setTimeout(function(){
            cb();
        }, 1000)
    });
});

// FILE RENAMING

gulp.task('change-files', ['create-binaries'], function() {
    var streams = [];

    osVersions.map(function(os){
        var path = './dist_'+ type +'/'+ filenameUppercase +'-'+ os;

        // change version file
        streams.push(gulp.src([
            path +'/version'
            ])
            .pipe(replace(electronVersion, version))
            .pipe(gulp.dest(path +'/')));

        // copy license file
        streams.push(gulp.src([
            './LICENSE'
            ])
            .pipe(gulp.dest(path +'/')));


        // copy authors file
        streams.push(gulp.src([
            './AUTHORS'
            ])
            .pipe(gulp.dest(path +'/')));

        // copy and rename readme
        streams.push(gulp.src([
            './Wallet-README.txt'
            ], { base: './' })
            .pipe(rename(function (path) {
                path.basename = "README";
            }))
            .pipe(gulp.dest(path + '/')));

        var destPath = (os === 'darwin-x64')
            ? path +'/'+ filenameUppercase +'.app/Contents/Frameworks/node'
            : path +'/resources/node';



        // copy eth node binaries
        streams.push(gulp.src([
            './nodes/eth/'+ os + '/*'
            ])
            .pipe(gulp.dest(destPath +'/eth')));

        // copy geth node binaries
        streams.push(gulp.src([
            './nodes/geth/'+ os + '/*'
            ])
            .pipe(gulp.dest(destPath +'/geth')));

    });


    return merge.apply(null, streams);
});


//gulp.task('cleanup-files', ['change-files'], function (cb) {
//  return del(['./dist_'+ type +'/**/Wallet-README.txt'], cb);
//});


gulp.task('rename-folders', ['change-files'], function(done) {
    var count = 0;
    var called = false;
    osVersions.forEach(function(os){

        var path = createNewFileName(os);

        fs.renameSync('./dist_'+ type +'/'+ filenameUppercase +'-'+ os, path);

        // change icon on windows
        if(os.indexOf('win32') !== -1) {
            rcedit(path +'/'+ filenameUppercase +'.exe', {
                'file-version': version,
                'product-version': version,
                'icon': './icons/'+ type +'/icon.ico'
            }, function(){
                if(!called && osVersions.length === count) {
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

        if(!called && osVersions.length === count) {
            done();
            called = true;
        }
    });
});


gulp.task('zip', ['rename-folders'], function () {
    var streams = osVersions.map(function(os){
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
    osVersions.forEach(function(os){

        var path = createNewFileName(os) + '.zip';

        // spit out sha256 checksums
        var fileName = path.replace('./dist_'+ type +'/', '');
        var sha = spawn('shasum', ['-a','256',path]);
        sha.stdout.on('data', function(data){
            console.log('SHA256 '+ fileName +': '+ data.toString().replace(path, ''));
        });


        count++;
        if(osVersions.length === count) {
            done();
        }
    });
});



gulp.task('taskQueue', [
    'clean:dist',
    'copy-files',
    'copy-i18n',
    'switch-production',
    'bundling-interface',
    'create-binaries',
    'change-files',
    //'cleanup-files',
    'rename-folders'
    // 'zip',
]);

// DOWNLOAD nodes
gulp.task('update-nodes', [
    'renameNodes'
]);
gulp.task('download-nodes', ['update-nodes']);

// MIST task
gulp.task('mist', [
    'set-variables-mist',
    'taskQueue'
]);

// WALLET task
gulp.task('wallet', [
    'set-variables-wallet',
    'taskQueue'
]);

// WALLET task
gulp.task('mist-checksums', [
    'set-variables-mist',
    'getChecksums'
]);
gulp.task('wallet-checksums', [
    'set-variables-wallet',
    'getChecksums'
]);



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

