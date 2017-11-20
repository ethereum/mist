//cranelv wanchain OTA database 2017-11-19
const logger = require('../utils/logger');
const db = global.db = require('../db');

const log = logger.create('wanChainOTAs');
/*
OTAsCollection struct
    adress:
    OTA:
    value:
    state:
 */

exports.getScanedByWaddr = function(waddr){
    let ScanBlockIndex = db.getCollection('ScanBlockIndex');
    let Index = ScanBlockIndex.find({'address': waddr});
    console.log("getScanedByWaddr:", Index);
    const begin = Index.length === 0 ? 0:Index[0].index;
    return begin;
}
exports.setScanedByWaddr = function (waddr, scaned) {
    let ScanBlockIndex = db.getCollection('ScanBlockIndex');
    var found = ScanBlockIndex.findOne({'_id': waddr});
    console.log("found:",found);
    if(found == null) {
        ScanBlockIndex.insert({
            _id: waddr,
            index: scaned,
        });
    } else {
        found.index = scaned;
        ScanBlockIndex.update(found);
    }
}
exports.insertOtabyWaddr = function(waddr, ota, value, status) {
    let OTAsCollection = db.getCollection('OTAsCollection');
    let Key = waddr.toLowerCase();
    try {
        OTAsCollection.insert({'address': Key, '_id':ota, 'value':value, 'state':status});
    }catch(err){
        console.log("insertOtabyWaddr:", err);
    }
}

exports.requireOTAsFromCollection = (waddr) =>
{
    console.log('scanOTAsByblocks:' + waddr);
    var OTAsCollection = db.getCollection('OTAsCollection');
    var Key = waddr.toLowerCase();
    console.log('scanOTAsByblocks:' + Key);
    return OTAsCollection.find({'address':Key});
}




