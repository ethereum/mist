/**
Decodes Data into values, for a given signature.

@module ABI
*/
const electron = require('electron');
const ipc = electron.ipcMain;
const abi = require('ethereumjs-abi');

ipc.on('backendAction_decodeFunctionSignature', function(event, signature, data){
	var dataBuffer, paramTypes;
	dataBuffer = new Buffer(data.slice(10, data.length), 'hex');
	signature = signature.match(/\((.+)\)/i);

	if (!signature) return;

	paramTypes = signature[1].split(',');

	try	{
		var paramsResponse = abi.rawDecode(paramTypes, dataBuffer);
		var paramsDictArr = [];

		// Turns addresses into proper hex string
		// Turns numbers into their decimal string version
		paramTypes.forEach((type, index) => {
			if (type == 'address') {
				paramsResponse[index] = '0x' + paramsResponse[index].toString('hex');
			}
			else {
				paramsResponse[index] = paramsResponse[index].toString();
			}
			paramsDictArr.push({type: type, value: paramsResponse[index]});
		});

		event.sender.send('uiAction_decodedFunctionSignatures', paramsDictArr);
	}
	catch(e){
		console.warn('ABI.js Warning:', e.message);
	}
});
