/**
@module syncMinimongo
*/



module.exports = function(db, webContents){

    var ipc = (webContents) ? require('electron').ipcMain : require('electron').ipcRenderer;


    // ONLY syncs from Mist UI to backend, not down again.

    // send
    db.find().observeChanges({
        'added': function(id, fields){
            // if(webContents && !webContents.isDestroyed())
            //     webContents.send('minimongo-add', {id: id, fields: fields});
            // else
            if(!webContents)
                ipc.send('minimongo-add', {id: id, fields: fields});
        },
        'changed': function(id, fields){
            // if(webContents && !webContents.isDestroyed())
            //     webContents.send('minimongo-changed', {id: id, fields: fields});
            // else
            if(!webContents)
                ipc.send('minimongo-changed', {id: id, fields: fields});
        },
        removed: function(id) {
            // if(webContents && !webContents.isDestroyed())
            //     webContents.send('minimongo-removed', id);
            // else
            if(!webContents)
                ipc.send('minimongo-removed', id);
        }
    });

    // receive
    ipc.on('minimongo-add', function(event, args) {

        if(!db.findOne(args.id)) {
            // console.log('add', args.id);
            args.fields._id = args.id;
            db.insert(args.fields);
        }
    });
    ipc.on('minimongo-changed', function(event, args) {

        // console.log('updated', args.id, args.fields);
        db.update(args.id, {$set: args.fields});
    });
    ipc.on('minimongo-removed', function(event, id) {

        db.remove(id.toString());
    });
};