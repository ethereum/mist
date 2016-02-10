/**
Gets the right Node path

@module getNodePath
*/

const path = require('path');
const binaryPath = path.resolve(__dirname + '/../nodes');

module.exports = function(type) {

    var binPath = (!global.production)
        ? binaryPath + '/'+ type +'/'+ process.platform +'-'+ process.arch + '/'+ type
        : binaryPath.replace('nodes','node') + '/'+ type +'/'+ type;

    if(global.production)
        binPath = binPath.replace('app.asar/','').replace('app.asar\\','');


    if(process.platform === 'win32') {
        binPath = binPath.replace(/\/+/,'\\');
        binPath += '.exe';
    }

    // if(process.platform === 'linux')
        //     binPath = type; // simply try to run a global binary

    return binPath;
};