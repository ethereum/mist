
module.exports = function() {
    var path = global.path.HOME;

    if(process.platform === 'darwin')
        path += '/Library/Ethereum/testChain/geth.ipc';

    if(process.platform === 'freebsd' ||
       process.platform === 'linux' ||
       process.platform === 'sunos')
        path += '/.ethereum/geth.ipc';

    // if(process.platform === 'win32')
    //     path = global.path.APPDATA + '/Ethereum/geth.ipc';
    
    console.log('CONNECT to IPC PATH: '+ path);
    return path;//'/tmp/geth.ipc';
};