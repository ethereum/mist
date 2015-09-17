var _ = require("underscore");
var gulp = require('gulp');
var exec = require('child_process').exec;
var del = require('del');
var replace = require('gulp-replace');
var packager = require('electron-packager')
var merge = require('merge-stream');
var rename = require("gulp-rename");
// var zip = require('gulp-zip');
var zip = require('gulp-jszip') 
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

var electronVersion = '0.31.2';
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
console.log('Bundling platforms: ', osVersions);

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
    applicationName = 'Ξthereum Wallet';
});


gulp.task('clean:dist', function (cb) {
  return del([
    './dist_'+ type +'/**/*',
    './meteor-dapp-wallet',
  ], cb);
});

gulp.task('copy-files', ['clean:dist'], function() {
    return gulp.src([
        './tests/**/*.*',
        './modules/**/*.*',
        './node_modules/**/*.*',
        './icons/'+ type +'/*.*',
        './*.*',
        '!./interface/**/*.*',
        '!./geth',
        '!./geth.exe',
        '!./main.js',
        '!./Wallet-README.txt'
        ], { base: './' })
        .pipe(gulp.dest('./dist_'+ type +'/app'));
});


gulp.task('switch-production', ['clean:dist'], function() {
    return gulp.src(['./main.js'])
        .pipe(replace('global.production = false;', 'global.production = true;'))
        .pipe(replace('global.mode = \''+ (type === 'mist' ? 'wallet' : 'mist') +'\';', 'global.mode = \''+ type +'\';'))
        .pipe(gulp.dest('./dist_'+ type +'/app'));
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
                 'cd ../dist_'+ type +'/ && git clone https://github.com/ethereum/meteor-dapp-wallet.git && cd meteor-dapp-wallet/app && meteor-build-client ../../app/interface/wallet -p "" && cd ../../ && rm -rf meteor-dapp-wallet', function (err, stdout, stderr) {
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
        './interface/i18n/*.*'
        ], { base: './' })
        .pipe(gulp.dest('./dist_'+ type +'/app'));
});

gulp.task('create-binaries', ['copy-i18n'], function(cb) {
    packager({
        dir: './dist_'+ type +'/app/',
        name: filenameUppercase,
        platform: options.platform.join(','),
        arch: 'all',
        version: electronVersion,
        out: './dist_'+ type +'/',
        icon: './icons/'+ type +'/icon.icns',
        'app-bundle-id': 'com.ethereum.'+ type,
        'app-version': version,
        // cache: './dist_'+ type +'/', // directory of cached electron downloads. Defaults to '$HOME/.electron'
        'helper-bundle-id': 'com.ethereum.'+ type + '-helper',
        ignore: '', //do not copy files into App whose filenames regex .match this string
        prune: true,
        overwrite: true,
        asar: true,
        // sign: '',
        'version-string': {
            CompanyName: 'Ethereum',
            // LegalCopyright
            // FileDescription
            // OriginalFilename
            // FileVersion: version,
            ProductVersion: version,
            ProductName: applicationName
            // InternalName: 
        }
    }, function(){
        setTimeout(function(){
            cb();
        }, 1000)
    });
});


gulp.task('change-files', ['create-binaries'], function (cb) {
    var streams = osVersions.map(function(os){
        var stream,
            path = './dist_'+ type +'/'+ filenameUppercase +'-'+ os;

        stream = gulp.src([
            path +'/version'
            ])
            .pipe(replace(electronVersion, version))
            .pipe(gulp.dest(path +'/'));

        return stream;
    });


    return merge.apply(null, streams);
});


gulp.task('add-readme', ['change-files'], function() {
    var streams = osVersions.map(function(os){
        var stream,
            path = './dist_'+ type +'/'+ filenameUppercase +'-'+ os;

        stream = gulp.src([
            './Wallet-README.txt'
            ], { base: './' })
            .pipe(gulp.dest(path + '/'));

        return stream;
    });


    return merge.apply(null, streams);
});

gulp.task('rename-readme', ['add-readme'], function() {
    var streams = osVersions.map(function(os){
        var stream,
            path = './dist_'+ type +'/'+ filenameUppercase +'-'+ os;

        stream = gulp.src([
            path + '/Wallet-README.txt'
            ])
            .pipe(rename(function (path) {
                path.basename = "README";
            }))
            .pipe(gulp.dest(path + '/'));

        return stream;
    });


    return merge.apply(null, streams);
});


gulp.task('cleanup-files', ['rename-readme'], function (cb) {
  return del(['./dist_'+ type +'/**/Wallet-README.txt'], cb);
});


gulp.task('rename-folders', ['cleanup-files'], function(done) {
    var count = 0;
    osVersions.forEach(function(os){
        var path = './dist_'+ type +'/'+ filenameUppercase +'-'+ os + '-'+ version.replace(/\./g,'-');
        fs.renameSync('./dist_'+ type +'/'+ filenameUppercase +'-'+ os, path);

        // change icon on windows
        if(os.indexOf('win32') !== -1) {
            rcedit(path +'/'+ filenameUppercase +'.exe', {
                'file-version': version,
                'product-version': version,
                'icon': './icons/'+ type +'/icon.ico'
            }, function(){
                if(osVersions.length === count) {
                    done();
                }
            });
        }

        count++;

        if(osVersions.length === count) {
            done();
            count++;
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



gulp.task('taskQueue', [
    'clean:dist',
    'copy-files',
    'copy-i18n',
    'switch-production',
    'bundling-interface',
    'create-binaries',
    'change-files',
    'add-readme',
    'rename-readme',
    'cleanup-files',
    'rename-folders',
    // 'zip'
]);


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


gulp.task('default', ['mist']);