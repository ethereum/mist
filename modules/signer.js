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

    async signWithJS(data, pw, callback) {
        console.log('∆∆∆ data in signWithJS', data);
        const strippedAddress = data.from.slice(2);

        // Fetch proper keystore file based on public key in data.from
        const keystoreDir = path.join(os.homedir(), 'Library', 'Ethereum', 'rinkeby', 'keystore');
        console.log('∆∆∆ keystoreDir', keystoreDir);

        let keystoreFile;
        let keystoreData;

        await fs.readdir(keystoreDir, (err, items) => {
            console.log('∆∆∆ items', items);

            items.forEach(item => {
                if (item.includes(strippedAddress)) {
                    keystoreFile = item;
                }
            });
            console.log('∆∆∆ keystoreFile', keystoreFile);

            fs.readFile(path.join(keystoreDir, keystoreFile), 'utf8', (err, data1) => {
                if (err) { console.log('error', err); }
                keystoreData = data1;
                console.log('∆∆∆ keystoreData', keystoreData);

                // Use ethjs-wallet to derive pk
                const wallet = ethWallet.fromV3(keystoreData, pw);
                const pkBuffer = wallet.getPrivateKey();
                console.log('∆∆∆ pkBuffer', pkBuffer);

                // use ethjs-tx to sign the tx
                const txParams = {
					nonce: data.nonce,
					gasPrice: data.gasPrice,
					gasLimit: data.gas,
					to: data.to,
					value: data.value,
					data: data.data,
                    chainId: 4 // TODO: remove hardcoding
                };
                const tx = new EthTx(txParams)
                tx.sign(pkBuffer);
                const serializedTx = tx.serialize().toString('hex');
                console.log('∆∆∆ serializedTx', serializedTx);

                // use something (geth? sendRawTx?) to broadcast
                callback(`0x${serializedTx}`);
            });
        });
    }

    async signWithSigner(data, pw, callback) {
        console.log('∆∆∆ this.keystorePath', this.keystorePath);
        console.log('∆∆∆ this.chainId', this.chainId);
        // this.signer = spawn('../signerBin/signer', ['-keystore', this.keystorePath, '-chainid', this.chainId, '-stdio-ui']);

        const signer = spawn('./signerBin/signer', [
            '-4bytedb', './signerBin/4byte.json',
            '-keystore', './keystoreTest',
            '-chainid', 4,
            '-stdio-ui'
        ]);

        const req = {
            jsonrpc: '2.0',
            id: 9,
            method: 'account_signTransaction',
            params: [data.from, data],
        };

        signer.stdout.on('data', (data) => {
            const signerStdout = data.toString();
            signerLog.log(`signerStdout: ${signerStdout}`);
            console.log('∆∆∆ signerStdout', signerStdout);

            callback(signerStdout);
        });

        signer.stderr.on('data', (data) => {
            signerLog.error(`stderr: ${data.toString()}`);
            console.log('∆∆∆ stderr', data.toString());
        });

        // TODO: kill process after close

        // Example request:
		// request.method = 'account_signTransaction';
		// request.params = [address, pw, {
			// nonce: "0x0",
			// gasPrice: "0x1234",
			// gas: "0x55555",
			// value: "0x1234",
			// input: "0xabcd",
			// to: "0x07a565b7ed7d7a678680a4c162885bedbb695fe0"
		// }];

        setTimeout(() => {
            console.log('∆∆∆ writing request to be stringifyd', demoReq);
            signer.stdin.write(JSON.stringify(demoReq));
        }, 3000);
        // Result: "dropping non-subscription message"
    }
}

module.exports = new Signer();
// const req = {
    // data: '',
    // from: '0xc3d97ff30555c4100c72fe1ad3db6dc46dc68325',
    // gas: '0x1d8a8',
    // gasPrice: '0x430e23400',
    // to: '0x9d7c92bc5d17f5ec43adbda8df8ba0f17a3bfb3f',
    // value: '0x16345785d8a0000',
    // nonce: '0x2'
// };
// const signer = new Signer();
// signer.signWithJS(req)
