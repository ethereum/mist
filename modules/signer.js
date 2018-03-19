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

  async signWithSigner(data, pw, callback) {
    let error;

    console.log('∆∆∆ data in sign method', data);

    const signer = spawn('./signerBin/signer', [
      '-4bytedb',
      './signerBin/4byte.json',
      '-keystore',
      this.keystorePath,
      '-networkid',
      this.chainId,
      '-stdio-ui'
    ]);

    const req = {
      id: 1,
      jsonrpc: '2.0',
      method: 'account_signTransaction',
      params: [
        data.from,
        {
          gas: data.gas,
          gasPrice: data.gasPrice,
          nonce: data.nonce,
          to: data.to,
          value: data.value,
          data: data.data || '0x'
        }
      ]
    };

    // If stdout is longer than a certain length, its buffer may arrive chunked.
    // incompleteData is used to store the previous data to try JSON.parse again.
    var incompleteData;

    signer.stdout.on('data', async dataBuffer => {
      var dataString = dataBuffer.toString();

      if (incompleteData) {
        dataString = incompleteData.concat(dataString);
      }

      try {
        data = JSON.parse(dataString);
      } catch (error) {
        console.log(
          'error parsing output into JSON. adding to incompleteData and will try again'
        );
        incompleteData = (incompleteData || '') + dataString;
        return;
      }

      incompleteData = null; // Reset

      signerLog.log(`data: ${data}`);
      console.log('∆∆∆ data', data);

      if (data.method === 'ShowError') {
        signerLog.error(`ShowError from signer: ${data.params[0].text}`);
        console.error(`ShowError from signer: ${data.params[0].text}`);
        error = data.params[0].text;
        callback(null, error);
        // Kill process
        signer.stdin.pause();
        signer.kill();
        return;
      }

      if (data.method === 'ApproveTx') {
        const confirm = {
          id: data.id,
          jsonrpc: '2.0',
          result: {
            approved: true,
            transaction: data.params[0].transaction,
            from: data.params[0].from,
            password: pw
          }
        };

        console.log('∆∆∆ confirm!', confirm);

        signer.stdin.write(JSON.stringify(confirm));
      }
    });

    //  Child process output
    signer.stderr.on('data', data => {
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
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();
        if (data.result) {
          callback(data.result, error);
          console.log(`∆∆∆ data.result: ${data.result}`);
        } else {
          callback(null, result);
          console.error(`∆∆∆ error: ${result}`);
        }
      } catch (e) {
        console.log('∆∆∆ e!', e);
      } finally {
        // Kill process
        signer.stdin.pause();
        signer.kill();
      }
    }, 2000);
  }
}

module.exports = new Signer();
