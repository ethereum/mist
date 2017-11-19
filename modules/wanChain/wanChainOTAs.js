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
exports.scanOTAsByblocks = (address) =>
{
    console.log('scanOTAsByblocks:' + JSON.stringify(address));
    var OTAsCollection = db.getCollection('OTAsCollection');
    var ScanBlockIndex = db.getCollection('ScanBlockIndex');
    var Key = address.toLowerCase();
    console.log('scanOTAsByblocks:' + Key);
    var Index = ScanBlockIndex.find({'address': Key});
    var begin = Index !== null ? Index.index : 0;
    //cranelv 2017-11-19 opened for scanBlocks
/*
    var lastNum = web3.eth.blockNumber;
    for(var i=begin;i<lastNum;++i)
    {
        var OTAArray = web3.wan.eth_scanOTAbyAccount(address,i);

        _each(OTAArray,(e)=>{
            if(!OTAsCollection.find({'OTA':e}))
                OTAsCollection.insert({'address': Key,'OTA':e,'value':'0','state':'0'});
        });
    }
    ScanBlockIndex.upsert({address: address}, {$set: {
        address: address,
        index: lastNum-1,
    }});
    */
}
exports.requireOTAsFromCollection = (address) =>
{
    console.log('scanOTAsByblocks:' + address);
    var OTAsCollection = db.getCollection('OTAsCollection');
    var Key = address.toLowerCase();
    console.log('scanOTAsByblocks:' + Key);
    return OTAsCollection.find({'address':Key});
}
