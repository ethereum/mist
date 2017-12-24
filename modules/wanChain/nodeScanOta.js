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
const Web3 = require("web3");
const Settings = require('../settings');
const net = require('net');


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
function web3SendTransaction(web3Func, paras){
    return new Promise(function(success, fail){
        function _cb(err, hash){
            if(err){
                fail(err);
            } else {
                success(hash);
            }
        }
        paras.push(_cb);
        web3Func.apply(null, paras);
    });
}

class nodeScanOta  extends EventEmitter{
    constructor() {
        super();
        self = this;
        ethereumNode.on('state', _.bind(this._onNodeStateChanged, this));
    }
    getScanedBlock() {
        return wanchainDB.getScanedByWaddr(ethereumNode.otaDbKey);
    }
    setScanedBlock(scaned) {
        wanchainDB.setScanedByWaddr(ethereumNode.otaDbKey, scaned);
    }

    async scanBlock() {
        scanBlockIndex = self.getScanedBlock();
        var web3 = new Web3(new Web3.providers.IpcProvider( Settings.rpcIpcPath, net));
        try {
            lastBlockNumber = await web3SendTransaction(web3.eth.getBlockNumber, []);
        } catch (error) {
            log.info('getBlockNumber:', error);
        }

        {

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
                    let paramArrary = [blockCur, true];

                    let lastBlock;
                    try {
                        lastBlock = await web3SendTransaction(web3.eth.getBlock, paramArrary);
                    } catch (error) {
                        log.info('getBlockByNumber:', error);
                    }
                    lastBlock.transactions.forEach((tx) => {
                        if (tx.to == coinContractAddr) {
                            let cmd = tx.input.slice(2, 10).toString('hex');
                            if (cmd != fhs_buyCoinNote) {
                                return;
                            }
                            let inputPara = tx.input.slice(10);
                            let paras = parseContractMethodPara(inputPara, wanUtil.coinSCAbi, 'buyCoinNote');

                            wanchainDB.insertOtabyWaddr('', paras.OtaAddr, paras.Value.toString(), 0, lastBlock.timestamp, tx.from, blockCur, tx.hash);
                            log.debug("new ota found:", paras.OtaAddr, blockCur);
                        }
                    });

                    blockCur += 1;
                }
                wanchainDB.setScanedByWaddr(ethereumNode.otaDbKey, blockEnd);
                scanTimer = setTimeout(self.scanBlock,checkInterval);
        }

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
