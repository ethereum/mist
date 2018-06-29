const gulp = require('gulp');
const mocha = require('gulp-spawn-mocha');
const options = require('../gulpfile.js').options;
const { version } = require('../package.json');
const fs = require('fs');
const colors = require('colors/safe');

gulp.task('test', () => {
  return gulp.src([`./tests/${options.type}/${options.test}.test.js`]).pipe(
    mocha({
      timeout: 60000,
      ui: 'exports',
      reporter: 'spec',
      compilers: ['js:babel-core/register']
    })
  );
});

gulp.task('verify-artifacts', done => {
  // I don't like having a non-pure function here
  const fileExists = path => {
    const fileExist = fs.existsSync(path);
    if (fileExist) console.log(colors.green('\t✔︎', path));
    else console.error(colors.red('\t✕', path));

    return fileExist;
  };

  const makePath = productName => `./dist_${productName}/release/`;

  const dashedVersion = versionString => versionString.replace(/\./g, '-');

  const makeFilename = productName => version => kind => extension =>
    `${makePath(productName)}${[
      productNamePrefix(productName),
      kind,
      dashedVersion(version)
    ].join('-')}.${extension}`;

  // need to run .map().every() to display all files status, regardless of optimizations
  const allFilesExists = files => files.map(fileExists).every(f => f);

  // should be 'mist' or 'wallet'
  const productNamePrefix = productName =>
    productName == 'mist' ? 'Mist' : 'Ethereum-Wallet';

  const checkArtifactsLinux = filenameFragment =>
    allFilesExists([
      filenameFragment('linux32')('zip'),
      filenameFragment('linux64')('zip'),
      filenameFragment('linux32')('deb'),
      filenameFragment('linux64')('deb')
    ]);

  const checkArtifactsWindows = filenameFragment =>
    allFilesExists([
      filenameFragment('win32')('zip'),
      filenameFragment('win64')('zip'),
      filenameFragment('installer')('exe')
    ]);

  const checkArtifactsMac = filenameFragment =>
    allFilesExists([filenameFragment('macosx')('dmg')]);

  const checkArtifacts = platform => productName => version => {
    const filenameFragment = makeFilename(productName)(version);
    switch (platform) {
      case 'linux':
        return checkArtifactsLinux(filenameFragment);
      case 'win':
        return checkArtifactsWindows(filenameFragment);
      case 'mac':
        return checkArtifactsMac(filenameFragment);
      default:
        return false;
    }
  };

  // mist, wallet
  const product = options.type;

  // win, mac, linux
  const platforms = options.activePlatforms;

  console.log(colors.yellow('Checking for generated artifacts...'));
  const artifactsAssertion = platforms.map(platform =>
    checkArtifacts(platform)(product)(version)
  );

  if (artifactsAssertion.every(a => a)) {
    done();
  } else {
    done(
      'One or all artifacts does not exist or does not have a proper file name.'
    );
  }
});
