var gulp = require('gulp');
var exec = require('child_process').exec;
var del = require('del');
var replace = require('gulp-replace');
var packager = require('electron-packager')
var merge = require('merge-stream');
var rename = require("gulp-rename");
var zip = require('gulp-zip');
var minimist = require('minimist');
var fs = require('fs');

var options = minimist(process.argv.slice(2), {
    string: 'platform',
    default: {
        platform: 'all'
    }
});


// CONFIG
var type = 'mist';
var filenameLowercase = 'mist';
var filenameUppercase = 'Mist';
var applicationName = 'Mist'; 

var electronVersion = '0.30.4';
var osVersions = [];
var packJson = require('./package.json');
var version = packJson.version;

console.log('You can select a platform like: --platform (all or darwin or win32 or linux)');

console.log('Mist version:', version);
console.log('Electron version:', electronVersion);


if(options.platform === 'all')
    osVersions =[
        'darwin-x64',
        'linux-arm',
        'linux-ia32',
        'linux-x64',
        'win32-ia32',
        'win32-x64'
    ];
if(options.platform === 'win32')
    osVersions = [
        'win32-ia32',
        'win32-x64'
    ];
if(options.platform === 'linux')
    osVersions = [
        'linux-arm',
        'linux-ia32',
        'linux-x64'
    ];
if(options.platform === 'darwin')
    osVersions = [
        'darwin-x64'
    ];


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
        './*.*',
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
        console.log('Pulling https://github.com/ethereum/meteor-dapp-wallet "master" branch...');
        exec('cd dist_'+ type +'/ && git clone https://github.com/ethereum/meteor-dapp-wallet.git && cd meteor-dapp-wallet/app && meteor-build-client ../../app/interface -p "" && cd ../../ && rm -rf meteor-dapp-wallet', function (err, stdout, stderr) {
            // console.log(stdout);
            console.log(stderr);

            cb(err);
        });
    }
});


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
        platform: options.platform,
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


gulp.task('rename-folders', ['cleanup-files'], function() {
    osVersions.forEach(function(os){
        fs.renameSync('./dist_'+ type +'/'+ filenameUppercase +'-'+ os, './dist_'+ type +'/'+ filenameUppercase +'-'+ os + '-'+ version.replace(/\./g,'-'));
    });
});


gulp.task('zip', ['rename-folders'], function () {
    var streams = osVersions.map(function(os){
        var stream,
            name = filenameUppercase +'-'+ os +'-'+ version.replace(/\./g,'-');

            // TODO doesnt work!!!!!
        stream = gulp.src([
            './dist_'+ type +'/'+ name + '/**/**/**/**/**/**/**/**/*'
            ])
            .pipe(zip(name +'.zip'))
            .pipe(gulp.dest('./dist_'+ type +'/'));

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