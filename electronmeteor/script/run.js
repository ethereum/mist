// Electrometeor uses the convenience script shelljs/global to reduce verbosity.
// If polluting your global namespace is not desirable, simply require shelljs.
//
// Example:
//
// var shell = require('shelljs');
// shell.echo('hello world');
'use strict';

require('shelljs/global');
var spawn = require('child_process').spawn;
var path = require('path');

// Make sure we don't try to run in production
process.env.NODE_ENV = 'development';

// Get the directory of the current script
var dir = __dirname;
var base = path.normalize(path.join(dir, '..'));

var onWindows = false;
var osName = exec('echo %OS% | tr "[:upper:]" "[:lower:]" | xargs echo -n', {silent: true}).output;
if (osName.indexOf('windows') !== -1) {
  osName = 'windows';
  onWindows = true;
} else {
  osName = exec('uname -s | tr "[:upper:]" "[:lower:]" | xargs echo -n', {silent: true}).output;
  onWindows = false;
}

console.log('On Windows: ', onWindows);
console.log(osName);

cd(base + '/meteor');


// Start Meteor
// ============
var meteorCommand = onWindows === true ? 'meteor.bat' : 'meteor';
var meteor = spawn(meteorCommand);


// Start Electron
// ==============
var electronPath = '';
if (osName === 'darwin') {
  electronPath = '/cache/electron/electron.app/contents/MacOS/Electron';
} else {
  electronPath = '/cache/electron/electron';
}
var electron = exec(base + electronPath + ' ' + base, {async: true});


// Sign Pre-nup
// ============
function killMeteor () {
  if (onWindows) {
    spawn('taskkill', ['/pid', meteor.pid, '/f', '/t']);
  } else {
    meteor.kill('SIGINT');
  }
}

function killElectron () {
  if (onWindows) {
    spawn('taskkill', ['/pid', electron.pid, '/f', '/t']);
  } else {
    electron.kill('SIGINT');
  }
}


// Monitor the incoming data
// Meteor
// =========================
meteor.stdout.setEncoding('utf8');
meteor.stdout.on('data', function (data) {
  console.log(data);
});

meteor.stderr.setEncoding('utf8');
meteor.stderr.on('data', function (data) {
  console.log('stderr: ', data);
});

// Electron
// =========================
electron.stdout.on('data', function(data) {
  if (!data === 'Cleaning up children.') {
    console.log(data);
  }
});

// Clean up after yourself
// =======================
meteor.stdout.on('close', function() {
  killElectron();
});

electron.stdout.on('close', function() {
  killMeteor();
});
