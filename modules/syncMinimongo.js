var ipc = require('ipc');


module.exports = function(db, webContents){

    // ONLY syncs from Mist UI to backend, not down again.

    // send
    db.find().observeChanges({
        'added': function(id, fields){
            // if(webContents)
            //     webContents.send('minimongo-add', {id: id, fields: fields});
            // else
            if(!webContents)
                ipc.send('minimongo-add', {id: id, fields: fields});
        },
        'changed': function(id, fields){
            // if(webContents)
            //     webContents.send('minimongo-changed', {id: id, fields: fields});
            // else
            if(!webContents)
                ipc.send('minimongo-changed', {id: id, fields: fields});
        },
        removed: function(id) {
            // if(webContents)
            //     webContents.send('minimongo-removed', id);
            // else
            if(!webContents)
                ipc.send('minimongo-removed', id);
        }
    });

    // receive
    ipc.on('minimongo-add', function(event, args) {
        args = (webContents) ? args : event;

        if(!db.findOne(args.id)) {
            console.log('add', args.id);
            args.fields._id = args.id;
            db.insert(args.fields);
        }
    });
    ipc.on('minimongo-changed', function(event, args) {
        args = (webContents) ? args : event;

        console.log('updated', args.id, args.fields);
        db.update(args.id, {$set: args.fields});
    });
    ipc.on('minimongo-removed', function(event, id) {
        id = (webContents) ? id : event;

        db.remove(id.toString());
    });
};