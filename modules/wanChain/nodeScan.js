/**
The nodeScan module,
Mark the ota which belong to me.

@module nodeScan
*/
'use strict';

const EventEmitter = require('events').EventEmitter;
const log = require('../utils/logger').create('nodeScan');
let wanUtil = require('wanchain-util');
const wanchainDB = require('./wanChainOTAs');
let checkBurst = 5000;
let scanBlockIndexDb = 0;
let lastBlockNumberDb = 0;

let privKeyB;
let pubKeyA;
let otaDbTimer = 0;
let currentScanAddressDB = '';
let self;
class nodeScan  {
    constructor() {
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
        currentScanAddressDB = waddr;
        const myPub = wanUtil.recoverPubkeyFromWaddress(waddr);
        privKeyB = privB;
        pubKeyA = myPub.A;
        var nodesc = this;
        nodesc.checkOtainDb(waddr);

    }

    stop() {
        if (scanBlockIndexDb && currentScanAddressDB) {
            wanchainDB.setScanedByWaddr(currentScanAddressDB, scanBlockIndexDb);
        }
        if(otaDbTimer){
            clearTimeout(otaDbTimer);
            otaDbTimer = 0;
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
            ota.address = currentScanAddressDB;
            return true;
        }
        return false;
    }

    checkOtainDb() {
        scanBlockIndexDb = self.getScanedBlock(currentScanAddressDB);
        lastBlockNumberDb = wanchainDB.getScanedByWaddr(null);
        let checkinterval = 10000;
        if(  scanBlockIndexDb === lastBlockNumberDb && scanBlockIndexDb !== 0 ) {
            otaDbTimer = setTimeout(self.checkOtainDb, checkinterval);
            return;
        }
        let checkBlockIndex = scanBlockIndexDb+1;
        let blockEnd = lastBlockNumberDb;
        if(checkBlockIndex + checkBurst < lastBlockNumberDb){
            checkinterval = 100;
            blockEnd = scanBlockIndexDb + checkBurst;
        }
        log.info("checkOtainDb checkBlockIndex,lastBlockNumberDb,waddress: ",checkBlockIndex,lastBlockNumberDb, currentScanAddressDB);
        wanchainDB.checkOta(self.compareOta, checkBlockIndex, blockEnd);
        wanchainDB.setScanedByWaddr(currentScanAddressDB, blockEnd);
        log.debug('checkinterval:', checkinterval);
        otaDbTimer = setTimeout(self.checkOtainDb, checkinterval);
    }
}


module.exports = new nodeScan();
