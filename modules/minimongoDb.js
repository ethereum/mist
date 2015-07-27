
module.exports = function(dbName) {
    // make minimongo available
    require('../node_modules/minimongo-standalone/minimongo.js');
    
    db = new LocalCollection(dbName, {connection: null});

    return db;
};
