/**

@module Collections
*/



// BROWSER RELATED
// Contains the accounts
Tabs = new Mongo.Collection('tabs', {connection: null});

if (typeof window.syncDb !== 'undefined') {
    Tabs = window.syncDb.frontendSync(Tabs, Tabs._name);
}


// Contains the address book
AddressBook = new Mongo.Collection('address-book', {connection: null});
new PersistentMinimongo2(AddressBook, 'Mist');


// Contains the accounts
DoogleLastVisitedPages = new Mongo.Collection('doogle-last-visted-pages', {connection: null});
new PersistentMinimongo2(DoogleLastVisitedPages, 'Mist');

DoogleHistory = new Mongo.Collection('doogle-history', {connection: null});
new PersistentMinimongo2(DoogleHistory, 'Mist');



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