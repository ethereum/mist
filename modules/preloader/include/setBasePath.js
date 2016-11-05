/**
Sets the base path in production for the file protocol, so assets are loaded properly

@module setBasePath
*/

const electron = require('electron');
const path = require('path');
const remote = electron.remote;

module.exports = function (appPath) {
    // set the base path for relative assets in production mode
    if (remote.getGlobal('production') && ~location.origin.indexOf('file://')) {
        window.basePathHref = `${String(path.resolve(`${__dirname}/../../${appPath}`)).replace(/\\/g, '/').replace('/interface', '/app.asar/interface')}/`;
    }
};
