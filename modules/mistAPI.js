/**
@module MistAPI
*/

const ipc = require('ipc');

var queue = [];
var prefix = 'entry_';

// filterId the id to only contain a-z A-Z 0-9
var filterId = function(str) {
    var newStr = '';
    for (var i = 0; i < str.length; i++) {
        if(/[a-zA-Z0-9_-]/.test(str.charAt(i)))
            newStr += str.charAt(i);
    };
    return newStr;
};

ipc.on('mistAPI_callMenuFunction', function(id) {
    if(mist.menu.entries[id] && mist.menu.entries[id].callback)
        mist.menu.entries[id].callback();
});


// work up queue every 500ms
setInterval(function(){
    if(queue.length > 0) {
        ipc.sendToHost('mistAPI_menuChanges', queue);
        queue = [];
    }
}, 200);


/**
Mist API

TODO: queue up all changes and send them all together, to prevent multiple update calls in the mist ui db?

@class mist
@constructor
*/
var mist = {
    platform: process.platform,
    requestAccount:  function(){
        ipc.send('mistAPI_requestAccount');
    },
    menu: {
        entries: {},
        /**
        Sets the badge text for the apps menu button

        Example

            mist.menu.setBadge('Some Text')

        @method setBadge
        @param {String} text
        */
        setBadge: function(text){
            ipc.sendToHost('mistAPI_setBadge', text);
        },
        /**
        Adds/Updates a menu entry

        Example

            mist.menu.add('tkrzU', {
                name: 'My Meny Entry',
                badge: 50,
                position: 1,
                selected: true
            }, function(){
                // Router.go('/chat/1245');
            })

        @method add
        @param {String} id          The id of the menu, has to be the same accross page reloads.
        @param {Object} options     The menu options like {badge: 23, name: 'My Entry'}
        @param {Function} callback  Change the callback to be called when the menu is pressed.
        */
        'add': function(id, options, callback){
            id = prefix + filterId(id);

            var entry = {
                id: id,
                position: options.position,
                selected: !!options.selected,
                name: options.name,
                badge: options.badge,
            };

            queue.push({
                action: 'addMenu',
                entry: entry
            });

            if(callback)
                entry.callback = callback;

            this.entries[id] = entry;
        },
        'update': function(){
            this.add.apply(this, arguments);
        },
        /**
        Removes a menu entry from the mist sidebar.

        @method remove
        @param {String} id
        */
        'remove': function(id){
            id = prefix + filterId(id);

            delete this.entries[id];

            queue.push({
                action: 'removeMenu',
                id: id
            });
        },
        /**
        Removes all menu entries.

        @method clear
        */
        'clear': function(){
            queue.push({action: 'clearMenu'});
        }
    },
};

module.exports = mist;