/**
@module syncMinimongo
*/


const electron = require('electron');


module.exports = function(db, wnd){

    var log = (wnd) 
        ? require('./utils/logger').create('syncMinimongo/' + db._name)
        : console;

    var sendTarget = wnd || electron.ipcRenderer;

    // send
    db.find().observeChanges({
        'added': function(id, fields){            
            sendTarget.send('minimongo-add', {id: id, fields: fields});
        },
        'changed': function(id, fields){
            sendTarget.send('minimongo-changed', {id: id, fields: fields});
        },
        removed: function(id) {
            sendTarget.send('minimongo-removed', id);
        }
    });

    // receive

    var ipc = (wnd) ? electron.ipcMain : electron.ipcRenderer;

    ipc.on('minimongo-add', function(event, args) {
        log.trace('minimongo-add', args);

        if (!db.findOne(args.id)) {
            args.fields._id = args.id;

            db.insert(args.fields);
        }
    });

    ipc.on('minimongo-changed', function(event, args) {
        log.trace('minimongo-changed', args);

        db.update(args.id, {$set: args.fields});
    });

    ipc.on('minimongo-removed', function(event, id) {
        log.trace('minimongo-removed', id);

        db.remove(id.toString());
    });

    // get all data (synchronous)
    ipc.on('minimongo-reloadSync', function(event) {
        var docs = db.find({}).fetch();

        log.debug('minimongo-reloadSync, no. of docs:', docs.length);

        event.returnValue = JSON.stringify(docs);
    });

    // Frontend should reload all data from back-end at startup
    if (!wnd) {
        let dataStr = electron.ipcRenderer.sendSync('minimongo-reloadSync');

        if (dataStr) {
            log.debug('Repopulate db with minimongo-reloadSync data');

            db.remove({});

            JSON.parse(dataStr).forEach(function(record) {
                db.insert(record);
            });
        }
    }
};


