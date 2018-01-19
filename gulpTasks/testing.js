const gulp = require('gulp');
const mocha = require('gulp-spawn-mocha');
const options = require('../gulpfile.js').options;


gulp.task('test', () => {
    return gulp.src([
        `./tests/${options.type}/${options.test}.test.js`
    ]).pipe(mocha({
        timeout: 60000,
        ui: 'exports',
        reporter: 'spec',
        compilers: [
            'js:babel-core/register',
        ]
    }));
});
