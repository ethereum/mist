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
    let Index = ScanBlockIndex.find({'_id': waddr});
    console.log("getScanedByWaddr:", Index);
    const begin = Index.length === 0 ? 0:Index[0].index;
    return begin;
}
exports.setScanedByWaddr = function (waddr, scaned) {
    let ScanBlockIndex = db.getCollection('ScanBlockIndex');
    var found = ScanBlockIndex.findOne({'_id': waddr});
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
exports.updateOtaStatus = function(ota) {
    let OTAsCollection = db.getCollection('OTAsCollection');
    var found = OTAsCollection.findOne({'_id': ota});
    if(found){
        found.state = 1;
        OTAsCollection.update(found);
    }
}
exports.insertOtabyWaddr = function(waddr, ota, value, status,timeStamp,from) {
    let OTAsCollection = db.getCollection('OTAsCollection');
    let Key = waddr.toLowerCase();
    try {
        OTAsCollection.insert({'address': Key, '_id':ota, 'value':value, 'state':status, 'timeStamp':timeStamp,'otaFrom':from});
    }catch(err){
        console.log("insertOtabyWaddr:", err);
    }
}

exports.requireOTAsFromCollection = (where) =>
{
    var OTAsCollection = db.getCollection('OTAsCollection');
    return OTAsCollection.find(where);
}
exports.firstNewAccount = (newAccount) =>
{
    var accountCollection = db.getCollection('firstNewAccount');
    var found = accountCollection.findOne({'address': newAccount.address});
    if(found == null)
    {
        accountCollection.insert({'address': newAccount.address, 'name': newAccount.name});
    }
}
exports.requireAccountName = (address) =>
{
    console.log('requireAccountName:' + address);
    var accountCollection = db.getCollection('firstNewAccount');
    return accountCollection.find({'address': address});
}
