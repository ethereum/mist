/**
Decodes Data into values, for a given signature.

@module ABI
*/
const { ipcMain: ipc } = require('electron');
const abi = require('ethereumjs-abi');

function isHexType(type) {
    return _.includes(['address', 'bytes'], type) || type.match(/bytes\d+/g);
}

function padLeft(string, chars) {
    return (new Array(chars - string.length + 1).join('0')) + string;
};

ipc.on('backendAction_decodeFunctionSignature', (event, signature, data) => {
    let paramTypes;
    data = data.slice(10, data.length);
    signature = signature.match(/\((.+)\)/i);

    if (!signature) return;

    paramTypes = signature[1].split(',');

    try {
        const paramsResponse = abi.rawDecode(paramTypes, new Buffer(data, 'hex'));
        let paramsDictArr = [];

		// Turns addresses into proper hex string
		// Turns numbers into their decimal string version
        paramTypes.forEach((type, index) => {
            let conversionFlag = isHexType(type) ? 'hex' : null,
                prefix = isHexType(type) ? '0x' : '';

            paramsResponse[index] = paramsResponse[index].toString(conversionFlag);

            let res = type.match(/bytes(\d+)/i);
            if(type === 'address')
            	paramsResponse[index] = padLeft(paramsResponse[index], 40);
            else if(res)
            	paramsResponse[index] = padLeft(paramsResponse[index], Number(res[1])*2);

            paramsDictArr.push({type: type, value: prefix + paramsResponse[index]});
        });

        event.sender.send('uiAction_decodedFunctionSignatures', paramsDictArr);
    }
	catch (e) {
    console.warn('ABI.js Warning:', e.message);
}
});
