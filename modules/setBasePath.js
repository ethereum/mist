/**
Sets the base path in production, for the file protocol, so assets are loaded properly

@module setBasePath
*/

const path = require('path');
const remote = require('remote');

module.exports = function(appPath) {
    // set the base path for relative assets in production mode
    if(remote.getGlobal('production') && ~location.origin.indexOf('file://')) {
        var base = document.createElement('base');
        base.href = String(path.resolve(__dirname + '/../../'+ appPath)).replace('/interface','/app.asar/interface') + '/';
        document.getElementsByTagName('head')[0].appendChild(base);
    }
};
