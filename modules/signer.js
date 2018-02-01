// ∆∆∆ TODO: remove. This is for debugging - logs out spawn args
(function() {
	var childProcess = require("child_process");
	var oldSpawn = childProcess.spawn;
	function mySpawn() {
		console.log('spawn called');
		console.log(arguments);
		var result = oldSpawn.apply(this, arguments);
		return result;
	}
	childProcess.spawn = mySpawn;
})();

const spawn = require('child_process').spawn;
const path = require('path');
const logger = require('./utils/logger');
const signerLog = logger.create('Signer');
const fs = require('fs');
const os = require('os');
import ethWallet from 'ethereumjs-wallet';
import EthTx from 'ethereumjs-tx';
import fetch from 'node-fetch';

class Signer {
	get chainId() {
		switch (store.getState().nodes.network) {
			case 'main':
				return 1;
			case 'test':
				// fall-through
			case 'ropsten':
				return 3;
			case 'rinkeby':
				return 4;
			case 'kovan':
				return 42;
		}
	}

	get keystorePath() {
		const network = store.getState().nodes.network;
        console.log('∆∆∆ network', network);
		let basePath;
		switch (process.platform) {
			case 'darwin':
                basePath = path.join(os.homedir(), 'Library', 'Ethereum');
				break;
			case 'sunos':
				// fall-through
			case 'linux':
				basePath = path.join('.ethereum');
				break;
			case 'win32':
				basePath = path.join(process.env.APPDATA, 'Ethereum');
        }

		if (network === 'main') {
			return path.join(basePath, 'keystore');
		} else if (network === 'rinkeby') {
			return path.join(basePath, 'rinkeby', 'keystore');
		} else {
			return path.join(basePath, 'testnet', 'keystore');
		}
	}

    signWithJS(data, pw, callback) {
        console.log('∆∆∆ data in signWithJS', data);
        const strippedAddress = data.from.slice(2);

        fs.readdir(this.keystorePath, (err, items) => {
            console.log('∆∆∆ items', items);

            let keystoreFile;
            items.forEach(item => {
                if (item.includes(strippedAddress)) {
                    keystoreFile = item;
                }
            });
            console.log('∆∆∆ keystoreFile', keystoreFile);

            fs.readFile(path.join(this.keystorePath, keystoreFile), 'utf8', (err, keystoreData) => {
                if (err) { console.log('error', err); }

                console.log('∆∆∆ keystoreData', keystoreData);

                // Use ethereumjs-wallet to derive pk
                const wallet = ethWallet.fromV3(keystoreData, pw);
                const pkBuffer = wallet.getPrivateKey();
                console.log('∆∆∆ pkBuffer', pkBuffer);

                // use ethereumjs-tx to sign the tx
                const txParams = {
					nonce: data.nonce,
					gasPrice: data.gasPrice,
					gasLimit: data.gas,
					to: data.to,
					value: data.value,
					data: data.data,
                    chainId: this.chainId
                };
                const tx = new EthTx(txParams)
                tx.sign(pkBuffer);
                const serializedTx = tx.serialize().toString('hex');
                console.log('∆∆∆ serializedTx', serializedTx);

                callback(`0x${serializedTx}`);
            });
        });
    }

    async signWithSigner(data, pw, callback) {
        console.log('∆∆∆ data in sign method', data);

        // this.signer = spawn('../signerBin/signer', ['-keystore', this.keystorePath, '-chainid', this.chainId, '-stdio-ui']);
        const signer = spawn('./signerBin/signer', [
            '-4bytedb', './signerBin/4byte.json',
            '-keystore', './keystoreTest',
            '-chainid', 4,
            '-stdio-ui'
        ]);

        // payload pulled https://github.com/holiman/go-ethereum/blob/signer_mhs/cmd/signer/README.md#sample-call-2
		const req = {
		  "id": 999,
		  "jsonrpc": "2.0",
		  "method": "account_signTransaction",
		  "params": [
			data.from,
			{
			  "gas": data.gas,
			  "gasPrice": data.gasPrice,
			  "nonce": data.nonce,
			  "to": data.to,
			  "value": data.value,
              // "input": data.data,
			},
		  ],
		};

        signer.stdout.on('data', async (dataBuffer) => {
            const data = JSON.parse(dataBuffer.toString());
            signerLog.log(`data: ${data}`);
            console.log('∆∆∆ data', data);
            if (data.method === 'ApproveTx') { 
                const confirmation = {
                    id: data.id,
                    jsonrpc: '2.0',
                    result: { approved: false },
                };
                // const confirmation = {
                    // approved: true,
                    // transaction: data.params[0].transaction,
                    // from: data.params[0].from,
                    // password: pw,
                // };
                console.log('∆∆∆ confirmation!', confirmation);

                // const jsonrpc = Object.assign({}, data, { params: [ confirmation ] });
                // console.log('∆∆∆ jsonrpc', jsonrpc);

                signer.stdin.write(JSON.stringify(confirmation));
                signer.stdin.write('\n');

                // try {
                    // const response = await fetch('http://localhost:8550', {
                        // method: 'POST',
                        // body: JSON.stringify(jsonrpc),
                        // headers: {
                            // 'Content-Type': 'application/json',
                        // },
                    // });
                    // console.log('∆∆∆ approveTx response', response);
                // } catch (e) {
                    // console.log('∆∆∆ approveTx e!', e);
                // }
            }

            // callback(signerStdout);
        });

        //  Child process output
        signer.stderr.on('data', (data) => {
            signerLog.error(`process logger: ${data.toString()}`);
            console.log('∆∆∆ process logger', data.toString());
        });

        setTimeout(async () => {
            console.log('∆∆∆ writing request to be stringifyd', req);
            try {
                const response = await fetch('http://localhost:8550', {
                    method: 'POST',
                    body: JSON.stringify(req),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                console.log('∆∆∆ response', response);
            } catch (e) {
                console.log('∆∆∆ e!', e);
            }
            // signer.stdin.write(JSON.stringify(req));
            // Result: "dropping weird message"
        }, 2000);

        // TODO: kill process after resolution
    }
}  

module.exports = new Signer();

// TODO: for testing; remove
const req = {
    data: '',
    from: '0xc3d97ff30555c4100c72fe1ad3db6dc46dc68325',
    gas: '0x1d8a8',
    gasPrice: '0x430e23400',
    to: '0x9d7c92bc5d17f5ec43adbda8df8ba0f17a3bfb3f',
    value: '0x16345785d8a0000',
    nonce: '0x4'
};
const signer = new Signer();
signer.signWithSigner(req, 'omgomgomg', (data) => { console.log('[signer cb]', data) })
// signer.signWithJS(req)
