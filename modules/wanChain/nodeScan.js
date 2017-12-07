/**
The nodeScan module,
Scan the chain block.

@module nodeScan
*/

const EventEmitter = require('events').EventEmitter;
const ethereumNode = require('../ethereumNode');
const nodeScanOta = require('./nodeScanOta');
const log = require('../utils/logger').create('nodeScan');
const SolidityCoder = require('web3/lib/solidity/coder');
let wanUtil = require('wanchain-util');
const wanchainDB = require('./wanChainOTAs');
let checkBurst = 500;
let scanBlockIndex = 0;
let lastBlockNumber = 0;
let getLastBlockIter = 0;
let currentScanAddress = "";

const scanIntervalNormal = 60000;
const coinContractAddr = wanUtil.contractCoinAddress;
let privKeyB;
let pubKeyA;
let self=null;
let fhs_buyCoinNote = wanUtil.sha3('buyCoinNote(string,uint256)', 256).slice(0,4).toString('hex');
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


class nodeScan extends EventEmitter {
    constructor() {
        super();
        self = this;
    }
    getScanedBlock(waddr) {
        return wanchainDB.getScanedByWaddr(waddr);
    }
    setScanedBlock(waddr, scaned) {
        wanchainDB.setScanedByWaddr(waddr, scaned);
    }
    start(waddr, privB) {
        console.log('check ota by addr:', waddr);
        currentScanAddress = waddr;
        const myPub = wanUtil.recoverPubkeyFromWaddress(waddr);
        privKeyB = privB;
        pubKeyA = myPub.A;
        var nodesc = this;
        scanBlockIndex = nodesc.getScanedBlock(waddr);
        nodesc.checkOtainDb();

    }

    stop() {
        if (scanBlockIndex ) {
            wanchainDB.setScanedByWaddr(currentScanAddress, scanBlockIndex);
        }
    }
    restart(waddr, privB) {
        this.stop();
        this.start(waddr, privB);
    }
    compareOta(ota) {
        let otaPub = wanUtil.recoverPubkeyFromWaddress(ota._id);
        let A1 = wanUtil.generateA1(privKeyB, pubKeyA, otaPub.B);

        if (A1.toString('hex') === otaPub.A.toString('hex')) {
            ota.address = currentScanAddress;
            return true;
        }
        return false;
    }
    checkOtainDb() {
        let checkinterval = 60000;
        lastBlockNumber = wanchainDB.getScanedByWaddr(null);
        console.log("scanBlockIndex,lastBlockNumber:",scanBlockIndex,lastBlockNumber);
        if(lastBlockNumber === scanBlockIndex && scanBlockIndex !== 0 ) {
            setTimeout(self.checkOtainDb, checkinterval);
            return;
        }
        let blockEnd = lastBlockNumber;
        if(scanBlockIndex + checkBurst < lastBlockNumber){
            checkinterval = 100;
            blockEnd = scanBlockIndex + checkBurst;
        }
        wanchainDB.checkOta(self.compareOta, scanBlockIndex+1, blockEnd);
        wanchainDB.setScanedByWaddr(currentScanAddress, blockEnd);
        scanBlockIndex = blockEnd;
        setTimeout(self.checkOtainDb, checkinterval);
    }
}


module.exports = new nodeScan();
