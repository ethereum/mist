var ipc = require('ipc');

var prefix = 'entry_';


ipc.on('callFunction', function(id) {
    if(mist.menu[id] && mist.menu[id].callback)
        mist.menu[id].callback();
});


var mist = {
    menu: {},
    /**
    Adds/Updates a menu entry

    Example

         mist.addMenu('tkrzU', {badge: 50})

    @method addMenu
    @param {String} id          The id of the menu, has to be the same accross page reloads.
    @param {Object} options     The menu options like {badge: 23, name: 'My Entry'}
    @param {Function} callback  Change the callback to be called when the menu is pressed.
    */
    'addMenu': function(id, options, callback){
        id = prefix + id;

        var entry = {
            id: id,
            position: options.position,
            name: options.name,
            badge: options.badge
        };

        ipc.sendToHost('addMenu', entry);

        if(callback)
            entry.callback = callback;

        this.menu[id] = entry;
    },
    'updateMenu': function(){
        this.addMenu.apply(this, arguments);
    },
    /**
    Removes a menu entry from the mist sidebar.

    @method removeMenu
    @param {String} id
    */
    'removeMenu': function(id){
        id = prefix + id;

        delete this.menu[id];

        ipc.sendToHost('removeMenu', id);
    }
};

window.mist = mist;