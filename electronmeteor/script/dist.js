// Electrometeor uses the convenience script shelljs/global to reduce verbosity.
// If polluting your global namespace is not desirable, simply require shelljs.
//
// Example:
//
// var shell = require('shelljs');
// shell.echo('hello world');
'use strict';

console.log('Starting Distribution Script...');
require('shelljs/global');
var path = require('path');
// var zipFolder = require('zip-folder');
var AdmZip = require('adm-zip');

// Auto-exit on errors
config.fatal = true;


// Get the directory of the current script
var dir = __dirname;
var base = path.normalize(path.join(dir, '..'));
var onWindows = false;
var osName = exec('echo %OS% | tr "[:upper:]" "[:lower:]" | xargs echo -n', {silent: true}).output;
if (osName.indexOf('windows') !== -1) {
  osName = 'windows';
  onWindows = true;
} else if (osName === '%os%') {
  osName = exec('uname -s | tr "[:upper:]" "[:lower:]" | xargs echo -n', {silent: true}).output;
  osName = osName === 'darwin' ? 'osx' : osName;
  onWindows = false;
}

console.log('On Windows: ', onWindows);

var npmPath = base + '/cache/node/bin/npm';
var nodePath = base + '/cache/node/bin/node';
var projectVersion = require('../package.json').version;

var distName = 'Electrometeor';

if (onWindows) {
  npmPath = path.join(base, '/cache/nodejs/npm');
  nodePath = path.join(base, '/cache/nodejs/node.exe');
}


echo('-----> Building bundle from Meteor app, this may take a few minutes');

cd(base + '/meteor');
var meteorCommand = onWindows === true ? 'meteor.bat' : 'meteor';
exec(meteorCommand + ' build --directory ../.');

cd(base + '/bundle');
echo('-----> Installing bundle npm packages.');
cd('./programs/server');
exec(npmPath + ' install');
echo('Bundle created\n');

cd(base);

exec('rm -rf ./dist');
mkdir('./dist');

function buildDist (os, name) {
  var app = '';
  switch(os) {

    case 'windows':
      console.log('Windows build');

      app = name + '.exe';
      cp('-R', './cache/electron', './dist/windows');
      mv('./dist/windows/electron', './dist/windows/' + name);
      mv('./dist/windows/' + name + '/electron.exe', './dist/windows/' + name + '/' + app);
      mkdir('./dist/windows/' + name + '/resources/app');
      break;

    case 'linux':
      console.log('Linux build');

      app = name;
      cp('-R', './cache/electron', './dist/linux');
      mv('./dist/linux/electron', './dist/linux/' + name);
      mv('./dist/linux/' + name + '/electron', './dist/linux/' + name + '/' + app);
      mkdir('dist/linux/' + name + '/resources/app');
      break;

    case 'osx':
      console.log('Mac build');

      app = name + '.app';
      cp('-R', './cache/electron/Electron.app', './dist/' + osName);
      mv('./dist/osx/Electron.app', './dist/osx/' + app);
      mv('./dist/osx/' + app + '/Contents/MacOS/Electron', './dist/osx/' + app + '/Contents/MacOS/' + name);
      mkdir('dist/osx/' + app + '/Contents/Resources/app');
      break;

    default:
      throw new Error('Unrecognized Operating System. Exiting...');
  }
}

function copyMeteorBundle (os, name) {
  switch(os) {

    case 'windows':
    case 'linux':
      mv('bundle', './dist/' + os + '/' + name + '/resources/app');
      break;

    case 'osx':
      mv('bundle', './dist/osx/' + name + '.app/Contents/Resources/app');
      break;

    default:
      throw new Error('Unrecognized Operating System. Exiting...');
  }
}

function copyStartupFiles (os, name) {
  switch(os) {

    case 'windows':
    case 'linux':
      cp('./index.js', './dist/' + os + '/' + name + '/resources/app/');
      cp('./package.json', './dist/' + os + '/' + name + '/resources/app/');
      cp('-R', './node_modules', './dist/' + os + '/' + name + '/resources/app/');
      break;

    case 'osx':
      cp('./index.js', './dist/osx/' + name + '.app/Contents/Resources/app/');
      cp('./package.json', './dist/osx/' + name + '.app/Contents/Resources/app/');
      cp('-R', './node_modules', './dist/osx/' + name + '.app/Contents/Resources/app/');
      break;

    default:
      throw new Error('Unrecognized Operating System. Exiting...');
  }
}

function copyBinaryFiles (os, name) {
  switch(os) {

    case 'windows':
    case 'linux':
      mkdir('./dist/' + os + '/' + name + '/resources/app/resources');
      cp('./resources/*', './dist/' + os + '/' + name + '/resources/app/resources/');
      break;

    case 'osx':
      mkdir('./dist/osx/' + name + '.app/Contents/Resources/app/resources');
      cp('./resources/*', './dist/osx/' + name + '.app/Contents/Resources/app/resources/');
      break;

    default:
      throw new Error('Unrecognized Operating System. Exiting...');
  }
}

function copyIcon (os, name) {
  switch(os) {

    case 'windows':
    case 'linux':
      // Not sure if this is the right place to put the .icns file
      // May need to have a different extension.
      cp('electrometeor.icns', './dist/' + os + '/' + name + '/resources/electron.icns');
      break;

    case 'osx':
      cp('electrometeor.icns', './dist/osx/' + name + '.app/Contents/Resources/electron.icns');
      break;

    default:
      throw new Error('Unrecognized Operating System. Exiting...');
  }
}

function updatePlist (name) {
  echo('-----> Updating Info.plist version to ' + projectVersion);
  exec('/usr/libexec/PlistBuddy -c "Set :CFBundleVersion ' + projectVersion + '" ' + base + '/dist/osx/' + name + '.app/Contents/Info.plist');
  exec('/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName ' + distName + '" ' + base + '/dist/osx/' + name + '.app/Contents/Info.plist');
  exec('/usr/libexec/PlistBuddy -c "Set :CFBundleName ' + distName + '" ' + base + '/dist/osx/' + name + '.app/Contents/Info.plist');
  exec('/usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier ' + 'com.electrometeor.electrometeor' + '" ' + base + '/dist/osx/' + name + '.app/Contents/Info.plist');
  exec('/usr/libexec/PlistBuddy -c "Set :CFBundleExecutable ' + distName + '" ' + base + '/dist/osx/' + name + '.app/Contents/Info.plist');
}

function createZipFile (os, name) {
  var app = '';
  var zippedApp = '';
  switch(os) {

    case 'windows':
    case 'linux':
      app = base + '/dist/' + os + '/' + name;
      zippedApp = base + '/dist/' + os + '/' + name + '-' + projectVersion + '.zip';
      var zip = new AdmZip();

      zip.addLocalFolder(app);
      zip.writeZip(app, zippedApp);
      break;

    case 'osx':
      app = base + '/dist/' + os + '/' + name + '.app';
      zippedApp = base + '/dist/' + os + '/' + name + '-' + projectVersion + '.zip';
      exec('ditto -c -k --sequesterRsrc --keepParent ' + app + ' ' + zippedApp);
      break;

    default:
      throw new Error('Unrecognized Operating System. Exiting...');
  }
}




// Start creation process
// ======================

echo('-----> Creating ' + distName + ' app...');
buildDist(osName, distName);

echo('-----> Copying Meteor bundle into ' + distName);
copyMeteorBundle(osName, distName);

echo('-----> Copying startup files into ' + distName);
copyStartupFiles(osName, distName);

echo('-----> Copying binary files into ' + distName);
copyBinaryFiles(osName, distName);

echo('-----> Copying icon to ' + distName);
// copyIcon(osName, distName);

if (osName === 'osx') {
  updatePlist(distName);
}

echo('-----> Creating distributable zip file...\n');
// createZipFile(osName, distName);

echo('Done.');
if (osName === 'osx') {
  echo(distName + ' app available at dist/' + osName + '/' + distName + '.app');
} else {
  echo(distName + ' app available at dist/' + osName + '/' + distName);
}
// echo(distName + ' zip distribution available at dist/' + osName + '/' + distName + '-' + projectVersion + '.zip');
