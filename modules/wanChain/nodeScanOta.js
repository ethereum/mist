/**
The nodeScanOta module,
Scan the chain block, fetch all the OTAs to DB.

@module nodeScanOta
*/

'use strict';

const EventEmitter = require('events').EventEmitter;
const ethereumNode = require('../ethereumNode');
const log = require('../utils/logger').create('nodeScanOta');
const SolidityCoder = require('web3/lib/solidity/coder');
let wanUtil = require('wanchain-util');
const wanchainDB = require('./wanChainOTAs');


let scanBlockIndex = 0;
let lastBlockNumber = 0;
let scanTimer = 0;
let burst = 1000;
const coinContractAddr = wanUtil.contractCoinAddress;
let self;
let fhs_buyCoinNote = wanUtil.sha3('buyCoinNote(string,uint256)', 256).slice(0,4).toString('hex');

function parseContractMethodPara(paraData, abi, method) {
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


class nodeScanOta  extends EventEmitter{
    constructor() {
        super();
        self = this;
        ethereumNode.on('state', _.bind(this._onNodeStateChanged, this));
    }
    getScanedBlock() {
        return wanchainDB.getScanedByWaddr(null);
    }
    setScanedBlock(scaned) {
        wanchainDB.setScanedByWaddr(null, scaned);
    }

    scanBlock() {
        scanBlockIndex = self.getScanedBlock();
        ethereumNode.send('eth_blockNumber', [])
            .then(async (ret) => {
                lastBlockNumber = parseInt(ret.result);
                let checkInterval = 10000;
                if(scanBlockIndex === lastBlockNumber){
                    scanTimer = setTimeout(self.scanBlock,checkInterval);
                    return;
                }
                let blockCur = scanBlockIndex+1;
                let blockEnd = lastBlockNumber;
                if(blockCur + burst < lastBlockNumber){
                    blockEnd = scanBlockIndex + burst;
                    checkInterval = 10;
                }
                log.info("scanBlock blockCur,blockEnd: ",blockCur,blockEnd);
                while(blockCur <= blockEnd ) {
                    let paramArrary = ['0x'+blockCur.toString(16), true];
                    await ethereumNode.send('eth_getBlockByNumber', paramArrary)
                        .then((retBlock) => {
                            const block = retBlock.result;
                            retBlock.result.transactions.forEach((tx) => {
                                if (tx.to == coinContractAddr) {
                                    let cmd = tx.input.slice(2, 10).toString('hex');
                                    if (cmd != fhs_buyCoinNote) {
                                        return;
                                    }
                                    let inputPara = tx.input.slice(10);
                                    let paras = parseContractMethodPara(inputPara, wanUtil.coinSCAbi, 'buyCoinNote');
                                    wanchainDB.insertOtabyWaddr('', paras.OtaAddr, tx.value, 0, block.timeStamp, tx.from, blockCur, tx.hash);
                                    log.debug("new ota found:", paras.OtaAddr, blockCur);
                                }
                            });
                        })
                        .catch((error)=>{
                            log.debug("failed to get BlockNumber. Has geth crashed? ");
                        });
                    blockCur += 1;
                }
                wanchainDB.setScanedByWaddr(null, blockEnd);
                scanTimer = setTimeout(self.scanBlock,checkInterval);
            });
    }
    start() {
        scanBlockIndex = this.getScanedBlock();
        this.scanBlock();

    }
    stop() {
        if (scanTimer !== 0) {
            clearTimeout(scanTimer);
            scanTimer = 0;
        }
    }
    restart( ) {
        this.stop();
        this.start();
    }

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


module.exports = new nodeScanOta();
