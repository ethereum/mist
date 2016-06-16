var _ = require("underscore");
var gulp = require('gulp');
var exec = require('child_process').exec;
var del = require('del');
var replace = require('gulp-replace');
var runSequence = require('run-sequence');
var mocha = require('gulp-spawn-mocha');
var packager = require('electron-packager');
var spawn = require('child_process').spawn;
var merge = require('merge-stream');
var rename = require("gulp-rename");
var buildHelpers = require('./buildHelpers');
var download = require('gulp-download');
var decompress = require('gulp-decompress');
var tap = require("gulp-tap");
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
var applicationName = 'Mist'; 
var electronVersion = '1.2.2';
var gethVersion = '1.4.7';
var nodeUrls = {
    'darwin-x64': 'https://github.com/ethereum/go-ethereum/releases/download/v1.4.7/geth-OSX-2016061509421-1.4.7-667a386.zip',
    'linux-x64': 'https://github.com/ethereum/go-ethereum/releases/download/v1.4.7/geth-Linux64-20160615125500-1.4.7-667a386.tar.bz2',
    'win32-x64': 'https://github.com/ethereum/go-ethereum/releases/download/v1.4.7/Geth-Win64-20160615094032-1.4.7-667a386.zip',
    'linux-ia32': 'https://bintray.com/karalabe/ethereum/download_file?file_path=geth-1.4.7-stable-667a386-linux-386.tar.bz2',
    'win32-ia32': 'https://bintray.com/karalabe/ethereum/download_file?file_path=geth-1.4.7-stable-667a386-windows-4.0-386.exe.zip'
};

var osVersions = [];
var packJson = require('./package.json');
var version = packJson.version;


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






/// --------------------------------------------------------------

gulp.task('log-build-info', function(cb) {
    console.log('You can select a platform like: --platform (all or darwin or win32 or linux)');
    console.log('Mist version:', version);
    console.log('Electron version:', electronVersion);
    console.log('Bundling platforms: ', osVersions);
    cb();
});


// TASKS
gulp.task('set-variables-mist', ['log-build-info'], function () {
    type = 'mist';
    applicationName = 'Mist';
});
gulp.task('set-variables-wallet', ['log-build-info'], function () {
    type = 'wallet';
    applicationName = 'Ethereum Wallet';
});


gulp.task('clean:dist', function (cb) {
  return del([
    buildHelpers.buildDistPath(type, '**/*'),
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

gulp.task('copy-files', ['checkNodes', 'clean:dist'], function() {

    // check if nodes are there
    if(updatedNeeded){
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
        .pipe(gulp.dest(buildHelpers.buildDistPath(type, 'app')));
});



gulp.task('bundling-interface', ['copy-files'], function(cb) {
    fs.writeFileSync(buildHelpers.buildDistPath(type, 'app/config.json'), JSON.stringify({
        production: true,
        mode: type,
    }));

    if(type === 'mist') {
        exec(`cd interface && meteor-build-client ${buildHelpers.buildDistPath(type, 'app/interface')} -p ""`, function (err, stdout, stderr) {
            // console.log(stdout);
            console.log(stderr);

            cb(err);
        });
    }

    if(type === 'wallet') {
        // TODO move mist interface too

        if(options.walletSource === 'local') {
            console.log('Use local wallet at ../meteor-dapp-wallet/app');
            exec(`cd interface/ && meteor-build-client ${buildHelpers.buildDistPath(type, 'app/interface')} -p "" && 
                 cd ../../meteor-dapp-wallet/app && meteor-build-client ${buildHelpers.buildDistPath(type, 'app/interface/wallet')} -p ""`, function (err, stdout, stderr) {
                console.log(stdout);
                console.log(stderr);

                cb(err);
            });

        } else {
            console.log('Pulling https://github.com/ethereum/meteor-dapp-wallet/tree/'+ options.walletSource +' "'+ options.walletSource +'" branch...');
            exec( `cd interface/ && meteor-build-client ${buildHelpers.buildDistPath(type, 'app/interface')} -p "" && 
                 cd ${buildHelpers.buildDistPath(type)} && git clone https://github.com/ethereum/meteor-dapp-wallet.git && cd meteor-dapp-wallet/app && meteor-build-client ${buildHelpers.buildDistPath(type, 'app/interface/wallet')} -p "" && cd ../../ && rm -rf meteor-dapp-wallet`, function (err, stdout, stderr) {
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
        .pipe(gulp.dest(buildHelpers.buildDistPath(type, 'app')));
});

gulp.task('create-binaries', ['copy-i18n'], function(cb) {
    packager({
        dir: buildHelpers.buildDistPath(type, 'app'),
        out: buildHelpers.buildDistPath(type),
        name: buildHelpers.buildAppExecName(type),
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
        var stream,
            path = buildHelpers.buildDistPath(
                type,
                buildHelpers.buildDistPkgName(os, type)
            )

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
            ? path +'/'+ buildHelpers.buildAppExecName(type) +'.app/Contents/Frameworks/node'
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



gulp.task('rename-folders', ['change-files'], function(done) {
    var count = 0;
    var called = false;
    osVersions.forEach(function(os){

        var path = buildHelpers.buildDistPath(
            type,
            buildHelpers.buildDistPkgName(os, type, {
                includeVersion: true,
                replaceOs: true,
            })
        );

        fs.renameSync(buildHelpers.buildDistPath(
            type,
            buildHelpers.buildDistPkgName(os, type)
        ), path);

        // change icon on windows
        if(os.indexOf('win32') !== -1) {
            rcedit(path +'/'+ buildHelpers.buildAppExecName(type) +'.exe', {
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


        count++;

        if(!called && osVersions.length === count) {
            done();
            called = true;
        }
    });
});




gulp.task('getChecksums', [], function(done) {
    var count = 0;

    osVersions.forEach(function(os){

        var path = buildHelpers.buildDistPath(
            type,
            buildHelpers.buildDistPkgName(os, type, {
                includeVersion: true,
                replaceOs: true,
            })
        );

        // spit out shasum and md5
        var fileName = path.replace('./dist_'+ type +'/', '');
        var sha = spawn('shasum', [path]);
        sha.stdout.on('data', function(data){
            console.log('SHA256 '+ fileName +': '+ data.toString().replace(path, ''));
        });

        count++;
        if(osVersions.length === count) {
            done();
        }
    });
});



gulp.task('taskQueue', ['rename-folders']);


// MIST task
gulp.task('mist', function(cb) {
    runSequence('set-variables-mist','taskQueue', cb);
});

gulp.task('mist-checksums', function(cb) {
    runSequence('set-variables-mist','getChecksums', cb);
});

// WALLET task
gulp.task('wallet', function(cb) {
    runSequence('set-variables-wallet','taskQueue', cb);
});

gulp.task('wallet-checksums', function(cb) {
    runSequence('set-variables-wallet','getChecksums', cb);
});

// DOWNLOAD nodes
gulp.task('update-nodes', [
    'renameNodesDeleteOld'
]);
gulp.task('download-nodes', ['update-nodes']);


gulp.task('test-wallet', function() {
    return gulp.src([
        './test/wallet/*.test.js'
    ])
    .pipe(mocha({
        timeout: 30000,
        ui: 'exports',
        reporter: 'spec'
    }));
});



gulp.task('default', ['mist']);


