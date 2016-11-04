/**
Decodes Data into values, for a given signature.

@module ABI
*/
const electron = require('electron');
const ipc = electron.ipcMain;
const abi = require('ethereumjs-abi');

function isHexType(type) {
    return _.includes(['address', 'bytes'], type) || type.match(/bytes\d+/g);
}

ipc.on('backendAction_decodeFunctionSignature', (event, signature, data) => {
    let dataBuffer, paramTypes;
    signature = signature.match(/\((.+)\)/i);

    if (!signature) return;

    paramTypes = signature[1].split(',');

    try {
    	dataBuffer = new Buffer(data.slice(10, data.length), 'hex');
        const paramsResponse = abi.rawDecode(paramTypes, dataBuffer);
        let paramsDictArr = [];

        // Turns addresses into proper hex string
        // Turns numbers into their decimal string version
        paramTypes.forEach((type, index) => {
            let conversionFlag = isHexType(type) ? 'hex' : null,
                prefix = isHexType(type) ? (paramsResponse[index].length%2 ? '0x' : '0x0') : '';

            paramsResponse[index] = paramsResponse[index].toString(conversionFlag);

            paramsDictArr.push({type: type, value: prefix + paramsResponse[index]});
        });

        event.sender.send('uiAction_decodedFunctionSignatures', paramsDictArr);
    }
    catch(e){
        console.warn('ABI.js Warning:', e.message);
    }
});
