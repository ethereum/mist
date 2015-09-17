/**

@module Collections
*/

// STOP here if not MAIN WINDOW
if(location.hash)
    return;


// BROWSER RELATED

// Contains the accounts
Tabs = new Mongo.Collection('tabs', {connection: null});
new PersistentMinimongo(Tabs, 'Mist');
syncMinimongo(Tabs);


// Contains the accounts
DoogleLastVisitedPages = new Mongo.Collection('doogle-last-visted-pages', {connection: null});
new PersistentMinimongo(DoogleLastVisitedPages, 'Mist');

DoogleHistory = new Mongo.Collection('doogle-history', {connection: null});
new PersistentMinimongo(DoogleHistory, 'Mist');



// ETHEREUM RELATED

// Accounts collection is add by the ethereum:accounts package

// LastBlock collection is add by the ethereum:accounts package

// contains blockchain meta data
// LastBlock = new Mongo.Collection('lastblock', {connection: null});
// new PersistentMinimongo(LastBlock, 'Mist');
// if(!LastBlock.findOne('latest'))
//     LastBlock.insert({
//         _id: 'latest',
//         blockNumber: 0,
//         blockHash: 0,
//         gasPrice: 0,
//         checkpoint: 0
//     });

// Blockchain = new Mongo.Collection('blockchain', {connection: null});