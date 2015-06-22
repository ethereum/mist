var remote = require('remote');
var ipc = require('ipc');
var web3 = require('web3'); //./node_modules/web3/dist/web3.min.js
var BigNumber = require('bignumber.js');
var prefix = 'entry_';


// set web3 providor
web3.setProvider(new web3.providers.HttpProvider("http://localhost:8545"));


// filterId the id to only contain a-z A-Z 0-9
var filterId = function(str) {
    var newStr = '';
    for (var i = 0; i < str.length; i++) {
        if(/[a-zA-Z0-9_-]/.test(str.charAt(i)))
            newStr += str.charAt(i);
    };
    return newStr;
};


ipc.on('callFunction', function(id) {
    if(mist.menu.entries[id] && mist.menu.entries[id].callback)
        mist.menu.entries[id].callback();
});


var mist = {
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
            ipc.sendToHost('setBadge', text);
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

            ipc.sendToHost('addMenu', entry);

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

            ipc.sendToHost('removeMenu', id);
        },
        /**
        Removes all menu entries.

        @method clear
        */
        'clear': function(){
            ipc.sendToHost('clearMenu');
        }
    },
};

window.mist = mist;
window.BigNumber = BigNumber;
window.web3 = web3;