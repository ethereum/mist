/**

@module Collections
*/


// BROWSER RELATED
// Contains the accounts
Tabs = new Mongo.Collection('tabs', { connection: null });
LastVisitedPages = new Mongo.Collection('last-visted-pages', { connection: null });
History = new Mongo.Collection('history', { connection: null });

// Sync collection from and to the backend loki.js
if (typeof window.dbSync !== 'undefined') {
    Tabs = window.dbSync.frontendSyncInit(Tabs);
    LastVisitedPages = window.dbSync.frontendSyncInit(LastVisitedPages);
    History = window.dbSync.frontendSyncInit(History);
}


// ETHEREUM RELATED

// Accounts collection is add by the ethereum:accounts package

// LastBlock collection is add by the ethereum:accounts package

// contains blockchain meta data
// LastBlock = new Mongo.Collection('lastblock', {connection: null});
// new PersistentMinimongo2(LastBlock, 'Mist');
// if(!LastBlock.findOne('latest'))
//     LastBlock.insert({
//         _id: 'latest',
//         blockNumber: 0,
//         blockHash: 0,
//         gasPrice: 0,
//         checkpoint: 0
//     });

// Blockchain = new Mongo.Collection('blockchain', {connection: null});
