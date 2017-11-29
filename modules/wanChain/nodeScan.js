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

let scanBlockIndex = 0;
let lastBlockNumber = 0;
let getLastBlockIter = 0;
let scanTimer = 0;
let currentScanAddress = "";

const scanIntervalNormal = 60000;
const coinContractAddr = "0x0000000000000000000000000000000000000006";
let privKeyB;
let pubKeyA;
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
        ethereumNode.send('eth_blockNumber', [])
            .then((ret) => {
                lastBlockNumber = parseInt(ret.result);
                scanTimer = setInterval(function(){
                        if(scanBlockIndex < lastBlockNumber)
                        {
                            let paramArrary = ['0x'+scanBlockIndex.toString(16), true];
                            ethereumNode.send('eth_getBlockByNumber', paramArrary)
                                .then((retBlock) => {
                                    console.log('XXXXXXXXXXXXXXX eth_getBlockByNumber', retBlock.result.number);
                                    const block = retBlock.result;

                                    retBlock.result.transactions.forEach((tx) => {
                                        if (tx.to == coinContractAddr) {
                                            let cmd = tx.input.slice(2, 10).toString('hex');
                                            if (cmd != fhs_buyCoinNote) {
                                                return;
                                            }
                                            let inputPara = tx.input.slice(10);
                                            let paras = parseContractMethodPara(inputPara, wanUtil.coinSCAbi, "buyCoinNote");
//                                            let value = paras.Value;
//                                            let ota = paras.OtaAddr;
                                            let otaPub = ethUtil.recoverPubkeyFromWaddress(paras.OtaAddr);
//                                            let otaA1 = otaPub.A;
//                                            let otaS1 = otaPub.B;
                                            let A1 = ethUtil.generateA1(privKeyB, pubKeyA, otaPub.B);

                                            if (A1.toString('hex') === otaPub.A.toString('hex')) {
                                                console.log("received a privacy transaction to me: ", paras.OtaAddr);
                                                console.log("the value is: ", paras.Value.toString());
                                                wanchainDB.insertOtabyWaddr(currentScanAddress, paras.OtaAddr, paras.Value, 0, block.timeStamp);
                                            }
                                        }
                                    });
                                });
                            ++scanBlockIndex;
                            if((scanBlockIndex%10000) == 0)
                            {
                                wanchainDB.setScanedByWaddr(currentScanAddress, scanBlockIndex);
                            }
                        }
                        else
                        {
                            ++getLastBlockIter;
                            if(getLastBlockIter>=6000)
                            {
                                getLastBlockIter = 0;
                                ethereumNode.send('eth_blockNumber', [])
                                    .then((ret) => {
                                        lastBlockNumber = parseInt(ret.result);
                                        getLastBlockIter = 0;
                                    });
                            }
                        }
                    },10);

            });
    }
    start(waddr, privB) {
        console.log('got addr:', waddr, privB.toString('hex'));
        currentScanAddress = waddr;
        const myPub = ethUtil.recoverPubkeyFromWaddress(waddr);
        privKeyB = privB;
        pubKeyA = myPub.A;
        var nodesc = this;
        scanBlockIndex = nodesc.getScanedBlock(waddr);
        nodesc.scanBlock();

    }
    stop() {
        if(scanTimer !== 0)
        {
            clearInterval(scanTimer);
            scanTimer = 0;
            wanchainDB.setScanedByWaddr(currentScanAddress, scanBlockIndex);
        }
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
