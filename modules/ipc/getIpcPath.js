
module.exports = function() {
    var path = global.path.HOME;

    if(process.platform === 'darwin')
        path += '/Library/Ethereum/geth.ipc';

    if(process.platform === 'freebsd' ||
       process.platform === 'linux' ||
       process.platform === 'sunos')
        path += '/.ethereum/geth.ipc';

    if(process.platform === 'win32')
        path = path.join('\\\\?\\pipe', process.cwd(), 'geth.ipc');//'\\.\pipe\geth.ipc'; //global.path.APPDATA + '/Ethereum/geth.ipc';
    
    console.log('CONNECT to IPC PATH: '+ path);
    return path;
};