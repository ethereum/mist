/**
@module syncMinimongo
*/


var electron = require('electron');


/**
 * Sync IPC calls received from given window into given db table.
 * @param  {Object} coll Db collection to save to.
 */
exports.backendSync = function(coll) {
    var log = require('./utils/logger').create('syncMinimongo/' + coll.name);

    var ipc = electron.ipcMain;

    ipc.on('minimongo-add', function(event, args) {
        log.trace('minimongo-add', args._id);

        var _id = args._id;

        if (!coll.findOne({_id: _id})) {
            args.fields._id = _id;

            coll.insert(args.fields);
        }
    });

    ipc.on('minimongo-changed', function(event, args) {
        log.trace('minimongo-changed', args._id);

        var _id = args._id;

        var item = coll.findOne({_id: _id});

        if (item) {
            for (var k in args.fields) {
                item[k] = args.fields[k];
            }

            coll.update(item);
        } else {
            log.error('Item not found in db', _id);
        }
    });

    ipc.on('minimongo-removed', function(event, args) {
        log.trace('minimongo-removed', args._id);

        var _id = args._id;

        var item = coll.findOne({_id: _id});

        if (item) {
            coll.remove(item);
        } else {
            log.error('Item not found in db', _id);
        }
    });

    // get all data (synchronous)
    ipc.on('minimongo-reloadSync', function(event) {
        var docs = coll.find();

        log.debug('minimongo-reloadSync, no. of docs:', docs.length);

        docs = docs.map(function(doc) {
            var ret = {};

            for (var k in doc) {
                if ('meta' !== k && '$loki' !== k) {
                    ret[k] = doc[k];
                }
            }

            return ret;
        });

        event.returnValue = JSON.stringify(docs);
    });
};



exports.frontendSync = function(coll) {
    var ipc = electron.ipcRenderer;

    console.debug('Reload collection from backend: ', coll._name);

    var syncDoneResolver = null;
    coll.onceSynced = new Promise(function(resolve, reject) {
        syncDoneResolver = resolve;
    });


    (new Promise(function(resolve, reject) {
        var dataStr = ipc.sendSync('minimongo-reloadSync');

        if (!dataStr) {
            return resolve();
        }

        try {
            coll.remove({});

            var dataJson = JSON.parse(dataStr);

            var done = 0;

            // we do inserts slowly, to avoid race conditions when it comes
            // to updating the UI
            dataJson.forEach(function(record) {
                Meteor.defer(function() {
                    try {
                        coll.insert(record);                
                    } catch (err) {
                        console.error(err.toString());                        
                    }

                    done++;

                    if (done >= dataJson.length) {
                        resolve();
                    }
                });
            });                
        } catch (err) {
            reject(err);
        }        
    }))
    .catch(function(err) {
        console.error(err.toString());
    })
    .then(function() {
        // start watching for changes
        coll.find().observeChanges({
            'added': function(id, fields){            
                ipc.send('minimongo-add', {_id: id, fields: fields});
            },
            'changed': function(id, fields){
                ipc.send('minimongo-changed', {_id: id, fields: fields});
            },
            removed: function(id) {
                ipc.send('minimongo-removed', {_id: id});
            }
        });
        
        console.debug('Finished reloading collection from backend: ', coll._name);

        syncDoneResolver();
    });
};


