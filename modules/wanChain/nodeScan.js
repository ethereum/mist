/**
The nodeScan module,
Scan the chain block.

@module nodeScan
*/

const EventEmitter = require('events').EventEmitter;
const ethereumNode = require('../ethereumNode');
const log = require('../utils/logger').create('nodeScan');
const SolidityCoder = require('web3/lib/solidity/coder');
let wanUtil = require('wanchain-util');
var ethUtil = wanUtil.ethereumUtil;
const wanchainDB = require('./wanChainOTAs');

let scanedBlock = 0;
let lastBlockNumber = 0;
let currentScanAddress = "";

const scanIntervalNormal = 60000;
const scanIntervalFast = 100;

const coinContractAddr = "0x0000000000000000000000000000000000000006";
let privKeyB;
let pubKeyA;
let scanTimer;
let fhs_buyCoinNote = ethUtil.sha3('buyCoinNote(string,uint256)', 256).slice(0,4).toString('hex');
function parseContractMethodPara(paraData, abi,method)
{
    var dict = {};
    var inputs = [];
    let i=0;
    for(i=abi.length-1; i>=0; i--){
        if(abi[i].name == method){
            inputs = abi[i].inputs;
            break;
        }
    }
    if(i >= 0){
        var format = [];
        for(let j=0; j<inputs.length; j++){
            format.push(inputs[j].type);
        }
        let paras = SolidityCoder.decodeParams(format,paraData);
        for(let j=0; j<inputs.length && j<paras.length; j++){
            dict[inputs[j].name] = paras[j];
        }
    }

    return dict;
}


class nodeScan  {

    getScanedBlock(waddr) {
        return wanchainDB.getScanedByWaddr(waddr);
    }
    setScanedBlock(waddr, scaned) {
        wanchainDB.setScanedByWaddr(waddr, scaned);
    }


    scanBlock() {
        if(scanedBlock < lastBlockNumber) {
            scanedBlock += 1;
            ethereumNode.send('eth_getBlockByNumber', ['0x'+scanedBlock.toString(16), true])
                .then((retBlock) => {
                    const block = retBlock.result;

                    block.transactions.forEach((tx)=>{
                           if(tx.to == coinContractAddr){
                                let cmd = tx.input.slice(2,10).toString('hex');
                                if(cmd != fhs_buyCoinNote){
                                    return;
                                }
                                let inputPara = tx.input.slice(10);
                                let paras = parseContractMethodPara(inputPara, wanUtil.coinSCAbi, "buyCoinNote");
                                let value = paras.Value;
                                let ota = paras.OtaAddr;
                                let otaPub = ethUtil.recoverPubkeyFromWaddress(ota);
                                let otaA1 = otaPub.A;
                                let otaS1 = otaPub.B;
                                let A1 = ethUtil.generateA1(privKeyB, pubKeyA, otaS1);

                                if(A1.toString('hex') === otaA1.toString('hex')){
                                    log.debug("received a privacy transaction to me: ",ota);
                                    log.debug("the value is: ", value.toString());
                                    wanchainDB.insertOtabyWaddr(currentScanAddress, ota, value, 0, block.timeStamp);
                                }
                            }
                    });
                    if(scanedBlock%100 == 0){
                        if (scanTimer)  clearTimeout(scanTimer);
                        scanTimer = setTimeout(() => { this.scanBlock(); }, scanIntervalFast);
                        log.info('scanedblock: ', scanedBlock, 'lastest: ', lastBlockNumber);
                        this.setScanedBlock(currentScanAddress, scanedBlock);
                    }else {
                        this.scanBlock();
                    }
                });
        } else {
            ethereumNode.send('eth_blockNumber', [])
                .then((ret) => {
                    lastBlockNumber = parseInt(ret.result);
                    if (scanedBlock === lastBlockNumber) {
                        this.setScanedBlock(currentScanAddress, scanedBlock);
                        if (scanTimer)  clearTimeout(scanTimer);
                        scanTimer = setTimeout(() => { this.scanBlock(); }, scanIntervalNormal);
                    } else {
                        this.scanBlock();
                    }
                });
        }
    }
    start(waddr, privB) {
        log.debug('got addr:', waddr, privB.toString('hex'));
        currentScanAddress = waddr;
        const myPub = ethUtil.recoverPubkeyFromWaddress(waddr);
        privKeyB = privB;
        pubKeyA = myPub.A;
        scanedBlock = this.getScanedBlock(waddr);
        this.scanBlock();
    }
    stop() {
        clearTimeout(scanTimer);
        this.setScanedBlock(currentScanAddress, scanedBlock);
    }
    restart(waddr, privB) {
        this.stop();
        this.start(waddr, privB);
    }
    /* todo: monitor scan cmd status
    _onScanStateChanged(state){

    }
    */
    _onNodeStateChanged(state) {
        switch (state) {  // eslint-disable-line default-case
            // stop Scaning when node about to be stopped
        case ethereumNode.STATES.STOPPING:
            log.info('Ethereum node stopping, so stop Scan');

            this.stop();
            break;
            // auto-Scan whenever node gets connected
        case ethereumNode.STATES.CONNECTED:
            log.info('Ethereum node connected, re-start Scan');

                // stop Scaning, then start again
            this.stop();
            this.start();
            break;
        }
    }
}


module.exports = new nodeScan();
