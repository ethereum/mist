/**
@module Collections
*/

Tabs = new Mongo.Collection('tabs', { connection: null });

LastVisitedPages = new Mongo.Collection('last-visted-pages', {
  connection: null
});

History = new Mongo.Collection('history', { connection: null });

// Sync collection from and to the backend loki.js
if (typeof window.dbSync !== 'undefined') {
  Tabs = window.dbSync.frontendSyncInit(Tabs);
  LastVisitedPages = window.dbSync.frontendSyncInit(LastVisitedPages);
  History = window.dbSync.frontendSyncInit(History);
}
