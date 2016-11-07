/**
@module MistAPI
*/

const { ipcRenderer: ipc, remote } = require('electron');
const packageJson = require('./../package.json');


module.exports = function (isWallet) {
    let queue = [];
    const prefix = 'entry_';

    // filterId the id to only contain a-z A-Z 0-9
    const filterId = function (str) {
        let newStr = '';
        for (let i = 0; i < str.length; i++) {
            if (/[a-zA-Z0-9_-]/.test(str.charAt(i)))
                { newStr += str.charAt(i); }
        }
        return newStr;
    };

    ipc.on('mistAPI_callMenuFunction', (e, id) => {
        if (mist.menu.entries[id] && mist.menu.entries[id].callback)
            { mist.menu.entries[id].callback(); }
    });

    ipc.on('windowMessage', (e, type, error, value) => {
        if (mist.callbacks[type]) {
            mist.callbacks[type].forEach((cb) => {
                cb(error, value);
            });
            delete mist.callbacks[type];
        }
    });

    // work up queue every 500ms
    setInterval(() => {
        if (queue.length > 0) {
            ipc.sendToHost('mistAPI_menuChanges', queue);
            queue = [];
        }
    }, 200);

    // preparing sounds
    // if wallet
    if (isWallet) {
        var sound = {
            bip: document.createElement('audio'),
            bloop: document.createElement('audio'),
            invite: document.createElement('audio'),
        };
        sound.bip.src = `file://${__dirname}/../sounds/bip.mp3`;
        sound.bloop.src = `file://${__dirname}/../sounds/bloop.mp3`;
        sound.invite.src = `file://${__dirname}/../sounds/invite.mp3`;
    }


    /**
    Mist API

    Provides an API for all dapps, which specifically targets features from the Mist browser

    @class mist
    @constructor
    */

    let mist = {
        callbacks: {},
        version: packageJson.version,
        mode: remote.getGlobal('mode'),
        license: packageJson.license,
        platform: process.platform,
        requestAccount(callback) {
            if (callback) {
                if (!this.callbacks.connectAccount)
                    { this.callbacks.connectAccount = []; }
                this.callbacks.connectAccount.push(callback);
            }

            ipc.send('mistAPI_requestAccount');
        },
        sounds: {
            bip() {
                // if wallet
                if (isWallet)
                    { sound.bip.play(); }
                // if mist
                else
                    { ipc.sendToHost('mistAPI_sound', sound.bip.src); }
            },
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
            setBadge(text) {
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
            add(id, options, callback) {
                id = prefix + filterId(id);

                const entry = {
                    id,
                    position: options.position,
                    selected: !!options.selected,
                    name: options.name,
                    badge: options.badge,
                };

                queue.push({
                    action: 'addMenu',
                    entry,
                });

                if (callback)
                    { entry.callback = callback; }

                this.entries[id] = entry;
            },
            update() {
                this.add.apply(this, arguments);
            },
            /**
            Removes a menu entry from the mist sidebar.

            @method remove
            @param {String} id
            */
            remove(id) {
                id = prefix + filterId(id);

                delete this.entries[id];

                queue.push({
                    action: 'removeMenu',
                    id,
                });
            },
            /**
            Removes all menu entries.

            @method clear
            */
            clear() {
                queue.push({ action: 'clearMenu' });
            },
        },
    };

    return mist;
};
