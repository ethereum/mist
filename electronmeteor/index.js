/*eslint strict:0*/
var childProcess = require('child_process');
var os = require('os');
var fs = require('fs');
var net = require('net');
var path = require('path');
var exec = childProcess.exec;

/* App Name */
/* -------- */
// Be sure to change this or your data might be stored
// somewhere you don't want it to be.
var appName = 'Electrometeor';


var app = require('app'); // Module to control application life.
var BrowserWindow = require('browser-window'); // Module to create native browser window.

var dirname = __dirname;
console.log(dirname); // The name of the directory that the currently executing script resides in.

// Before starting a local server, freePort will find an available port by letting
// the OS find it.
function freePort (callback) {
  var server = net.createServer();
  var port = 0;

  server.on('listening', function () {
    port = server.address().port;
    server.close();
  });
  server.on('close', function () {
    callback(null, port);
  });

  server.listen(0, '127.0.0.1');
}


// Write something about Start method
function start (callback) {
  if (process.env.NODE_ENV === 'development') {
    console.log('Running in Dev mode.');
    callback('http://localhost:3000');
  } else {
    process.stdout.write('Starting production server\n');

    var appPath = '',
        dataPath = '',
        bundlePath = '';
    if (os.platform() === 'darwin') {
      appPath = path.join(process.env.HOME, 'Library/Application Support/', appName, '/');
      dataPath = path.join(appPath, 'data');
      bundlePath = path.join(appPath, 'bundle');
    } else if (os.platform() === 'win32') {
      appPath = path.join(process.env.HOMEPATH, 'AppData/Local/', appName, '/');
      dataPath = path.join(appPath, 'data');
      bundlePath = path.join(appPath, 'bundle');
    } else if (os.platform() === 'linux') {
      appPath = path.join(process.env.HOME, '/.config/', appName, '/');
      dataPath = path.join(appPath, 'data');
      bundlePath = path.join(appPath, 'bundle');
    }

    // If file paths don't yet exist, create them
    if (!fs.existsSync(appPath)) {
      fs.mkdirSync(appPath);
    }

    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath);
    }

    if (!fs.existsSync(bundlePath)) {
      fs.mkdirSync(bundlePath);
    }

    freePort(function (err, webPort) {
      freePort(function (err, mongoPort) {
        console.log('MongoPort: ', mongoPort);
        console.log('WebPort: ', webPort);

        // Be sure to change the PURPOSE to be the name of your app
        var command = '';
        if (os.platform() === 'darwin' || os.platform === 'linux') {
          command = 'rm -rf ' + path.join(dataPath, 'mongod.lock');
        } else if (os.platform() === 'win32') {
          childProcess.exec('rm -rf ' + path.join(dataPath, 'mongod.lock'));
        }

        childProcess.exec(command, function (err, stdout, stderr) {

          // Path to mongod command bundled with app.
          var mongodPath = path.join(dirname, 'resources', 'mongod');

          // Arguments passed to mongod command.
          var mongodArgs = ['--bind_ip', '127.0.0.1', '--dbpath', dataPath, '--port', mongoPort, '--unixSocketPrefix', dataPath, '--smallfiles'];
          if (os.platform() === 'win32') {
            mongodArgs = ['--bind_ip', '127.0.0.1', '--dbpath', dataPath, '--port', mongoPort, '--smallfiles'];
          }

          // Start the Mongo process.
          var mongoChild = childProcess.spawn(mongodPath, mongodArgs, {
            env: {
              PURPOSE: 'MY_ELECTROMETEOR_APP'
            }
          });

          mongoChild.stderr.setEncoding('utf8');
          mongoChild.stderr.on('data', function (data) {
            console.log(data);
          });

          var started = false;
          mongoChild.stdout.setEncoding('utf8');
          mongoChild.stdout.on('data', function (data) {
            console.log(data);

            if (data.indexOf('waiting for connections on port ' + mongoPort)) {
              if (!started) {
                started = true;
              } else {
                return;
              }

              console.log('Starting node child...');
              var rootURL = 'http://localhost';
              var userEnv = process.env;
              userEnv.ROOT_URL = rootURL;
              userEnv.PORT = webPort;
              userEnv.BIND_IP = '127.0.0.1';
              userEnv.DB_PATH = dataPath;
              userEnv.MONGO_URL = 'mongodb://localhost:' + mongoPort + '/meteor';
              // user_env.METEOR_SETTINGS = fs.readFileSync(path.join(dirname, 'resources', 'settings.json'), 'utf8');
              userEnv.DIR = dirname;
              userEnv.NODE_ENV = 'production';
              userEnv.NODE_PATH = path.join(dirname, 'node_modules');

              var nodePath = path.join(dirname, 'resources', 'node');
              var nodeArgs = path.join(dirname, 'bundle', 'main.js');
              var nodeChild = childProcess.spawn(nodePath, [nodeArgs], {
                env: userEnv
              });

              var opened = false;

              // listen for errors
              nodeChild.stderr.setEncoding('utf8');
              nodeChild.stderr.on('data', function (nodeData) {
                console.log('stderr: ', nodeData);
              });

              nodeChild.stdout.setEncoding('utf8');
              nodeChild.stdout.on('data', function (nodeData) {
                console.log(nodeData);

                if (data.indexOf(!'Meteor app started.' === -1)) {
                  if (!opened) {
                    opened = true;
                  } else {
                    return;
                  }

                  setTimeout(function () {
                    var fullURL = rootURL + ':' + webPort;
                    callback(fullURL, nodeChild, mongoChild);
                  }, 100);
                }
              });
            }
          });
        });
      });
    });
  }
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the javascript object is GCed.

/*global mainWindow:true*/ // <-- This is to let ESLint know that it's ok to have a global and 'true' allows it to be read/write
mainWindow = null;

// Emitted when the application is activated while there is no opened windows.
// It usually happens when a user has closed all of application's windows and then
// click on the application's dock icon.
app.on('activate-with-no-open-windows', function () {
  if (mainWindow) {
    mainWindow.show();
  }

  return false;
});

// Emitted when Electron has done all of the initialization.
app.on('ready', function () {
  start(function (url, nodeChild, mongoChild) {
    console.log('App occupying ', url);
    var cleanup = function () {
      app.quit();
    };
    // Create the browser window.
    var windowOptions = {
      width: 800,
      height: 600,
      resizeable: true,
      frame: true
    };
    mainWindow = new BrowserWindow(windowOptions);
    mainWindow.focus();
    mainWindow.loadUrl(url);
    mainWindow.openDevTools();

    process.on('uncaughtException', cleanup);

    // Emitted when all windows have been closed and the application will quit.
    // Calling event.preventDefault() will prevent the default behaviour, which is
    // terminating the application.
    app.on('will-quit', function (event) {
      console.log(event);
      console.log('Cleaning up children.');

      if (nodeChild) {
        console.log('cleaning up node child');
        nodeChild.kill('SIGTERM');
      }

      if (mongoChild) {
        console.log('cleaning up mongo child');
        mongoChild.kill('SIGTERM');
      }

    });

    app.on('window-all-closed', function() {
      cleanup();
    });
  });
});
