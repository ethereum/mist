/**
Gets the right Node path

@module getNodePath
*/

const path = require('path');
const binaryPath = path.resolve(__dirname + '/../nodes');

module.exports = function(type) {

    var binPath = (global.production)
        ? binaryPath.replace('nodes','node') + '/'+ type +'/'+ type
        : binaryPath + '/'+ type +'/'+ process.platform +'-'+ process.arch + '/'+ type;

    if(global.production) {
        binPath = binPath.replace('app.asar/','').replace('app.asar\\','');
        
        if(process.platform === 'darwin') {
            binPath = path.resolve(binPath.replace('/node/', '/../Frameworks/node/'));
        }
    }


    if(process.platform === 'win32') {
        binPath = binPath.replace(/\/+/,'\\');
        binPath += '.exe';
    }

    // if(process.platform === 'linux')
        //     binPath = type; // simply try to run a global binary

    return binPath;
};