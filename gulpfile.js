var gulp = require('gulp');
// var exec = require('gulp-exec');
// var shell = require('gulp-shell');
var exec = require('child_process').exec;
var asar = require('gulp-asar');
var del = require('del');
var replace = require('gulp-replace');

var type = 'mist';

gulp.task('set-variables-mist', function () {
  type = 'mist';
});
gulp.task('set-variables-wallet', function () {
  type = 'wallet';
});


gulp.task('clean:dist', function (cb) {
  return del([
    './dist_'+ type +'/app/**/*',
    './dist_'+ type +'/app.asar',
    './meteor-dapp-wallet',
  ], cb);
});

gulp.task('copy-files', ['clean:dist'], function() {
    return gulp.src([
        './tests/**/*.*',
        './modules/**/*.*',
        './node_modules/**/*.*',
        './icons/**/*.*',
        './*.*',
        '!./main.js'
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
        exec('git clone https://github.com/ethereum/meteor-dapp-wallet.git && cd meteor-dapp-wallet/app && meteor-build-client ../../dist_'+ type +'/app/interface -p "" && cd ../../ && rm -rf meteor-dapp-wallet', function (err, stdout, stderr) {
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


gulp.task('pack-app', [
            'copy-i18n',
            'copy-files',
            'switch-production',
            'bundling-interface'], function() {
    gulp.src('./dist_'+ type +'/app/**/*', { base: './dist_'+ type +'/app/' })
        .pipe(asar('app.asar'))
        .pipe(gulp.dest('./dist_'+ type));
});


// MIST task
gulp.task('mist', [
    'set-variables-mist',
    'clean:dist',
    'copy-files',
    'copy-i18n',
    'switch-production',
    'bundling-interface',
    'pack-app'
]);

// WALLET task
gulp.task('wallet', [
    'set-variables-wallet',
    'clean:dist',
    'copy-files',
    'copy-i18n',
    'switch-production',
    'bundling-interface',
    'pack-app'
]);


gulp.task('default', ['mist']);