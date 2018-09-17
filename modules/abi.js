/**
Decodes Data into values, for a given signature.

@module ABI
*/
const _ = global._;
const { ipcMain: ipc } = require('electron');
const abi = require('ethereumjs-abi');

function isHexType(type) {
  return _.includes(['address', 'bytes'], type) || type.match(/bytes\d+/g);
}

function padLeft(string, chars) {
  return new Array(chars - string.length + 1).join('0') + string;
}

ipc.on('backendAction_decodeFunctionSignature', (event, _signature, _data) => {
  const data = _data.slice(10, _data.length);
  const signature = _signature.match(/\((.+)\)/i);

  if (!signature) return;

  const paramTypes = signature[1].split(',');

  try {
    const paramsResponse = abi.rawDecode(paramTypes, Buffer.from(data, 'hex'));
    const paramsDictArr = [];

    // Turns addresses into proper hex string
    // Turns numbers into their decimal string version
    paramTypes.forEach((type, index) => {
      const conversionFlag = isHexType(type) ? 'hex' : null;
      const prefix = isHexType(type) ? '0x' : '';

      paramsResponse[index] = paramsResponse[index].toString(conversionFlag);

      const res = type.match(/bytes(\d+)/i);
      if (type === 'address') {
        paramsResponse[index] = padLeft(paramsResponse[index], 40);
      } else if (res) {
        paramsResponse[index] = padLeft(
          paramsResponse[index],
          Number(res[1]) * 2
        );
      }

      paramsDictArr.push({ type, value: prefix + paramsResponse[index] });
    });

    event.sender.send('uiAction_decodedFunctionSignatures', paramsDictArr);
  } catch (e) {
    console.warn('ABI.js Warning:', e.message);
  }
});
