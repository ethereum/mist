/**
@module MistAPI
*/

const _ = require('underscore');
const { ipcRenderer } = require('electron');
const packageJson = require('./../../../package.json');

module.exports = () => {
  let queue = [];
  const prefix = 'entry_';
  const MIST_SUBMENU_LIMIT = 100;

  // todo: error handling
  const filterAdd = options => {
    if (!(options instanceof Object)) {
      return false;
    }

    return ['name'].every(e => e in options);
  };

  // filterId the id to only contain a-z A-Z 0-9
  const filterId = str => {
    const filteredStr = String(str);
    let newStr = '';
    if (filteredStr) {
      for (let i = 0; i < filteredStr.length; i += 1) {
        if (/[a-zA-Z0-9_-]/.test(filteredStr.charAt(i))) {
          newStr += filteredStr.charAt(i);
        }
      }
    }
    return newStr;
  };

  /**
    Mist API

    Provides an API for all dapps, which specifically targets features from the Mist browser

    @class mist
    @constructor
    */
  const mist = {
    callbacks: {},
    version: packageJson.version,
    license: packageJson.license,
    platform: process.platform,
    requestAccount(callback) {
      if (callback) {
        if (!this.callbacks.connectAccount) {
          this.callbacks.connectAccount = [];
        }
        this.callbacks.connectAccount.push(callback);
      }

      ipcRenderer.send('mistAPI_requestAccount');
    },
    solidity: {
      version: String(packageJson.dependencies.solc).match(/\d+\.\d+\.\d+/)[0]
    },
    sounds: {
      bip: function playSound() {
        ipcRenderer.sendToHost(
          'mistAPI_sound',
          `file://${__dirname}/../../../sounds/bip.mp3`
        );
      },
      bloop: function playSound() {
        ipcRenderer.sendToHost(
          'mistAPI_sound',
          `file://${__dirname}/../../../sounds/bloop.mp3`
        );
      },
      invite: function playSound() {
        ipcRenderer.sendToHost(
          'mistAPI_sound',
          `file://${__dirname}/../../../sounds/invite.mp3`
        );
      }
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
        ipcRenderer.sendToHost('mistAPI_setBadge', text);
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
        const args = Array.prototype.slice.call(arguments);
        callback = _.isFunction(args[args.length - 1]) ? args.pop() : null;
        options = _.isObject(args[args.length - 1]) ? args.pop() : null;
        id =
          _.isString(args[args.length - 1]) || _.isFinite(args[args.length - 1])
            ? args.pop()
            : null;

        if (!filterAdd(options)) {
          return false;
        }

        const filteredId = prefix + filterId(id);

        // restricting to 100 menu entries
        if (
          !(filteredId in this.entries) &&
          Object.keys(this.entries).length >= MIST_SUBMENU_LIMIT
        ) {
          return false;
        }

        const entry = {
          id: filteredId || 'mist_defaultId',
          position: options.position,
          selected: !!options.selected,
          name: options.name,
          badge: options.badge
        };

        queue.push({
          action: 'addMenu',
          entry
        });

        if (callback) {
          entry.callback = callback;
        }

        this.entries[filteredId] = entry;
        return true;
      },
      /**
            Updates a menu entry from the mist sidebar.

            @method update
            @param {String} id          The id of the menu, has to be the same accross page reloads.
            @param {Object} options     The menu options like {badge: 23, name: 'My Entry'}
            @param {Function} callback  Change the callback to be called when the menu is pressed.
            */
      update() {
        this.add.apply(this, arguments);
      },
      /**
            Removes a menu entry from the mist sidebar.

            @method remove
            @param {String} id
            @param {String} id          The id of the menu, has to be the same accross page reloads.
            @param {Object} options     The menu options like {badge: 23, name: 'My Entry'}
            @param {Function} callback  Change the callback to be called when the menu is pressed.
            */
      remove(id) {
        const filteredId = prefix + filterId(id);

        delete this.entries[filteredId];

        queue.push({
          action: 'removeMenu',
          filteredId
        });
      },
      /**
            Marks a menu entry as selected

            @method select
            @param {String} id
            */
      select(id) {
        const filteredId = prefix + filterId(id);
        queue.push({ action: 'selectMenu', id: filteredId });

        for (const e in this.entries) {
          if ({}.hasOwnProperty.call(this.entries, e)) {
            this.entries[e].selected = e === filteredId;
          }
        }
      },
      /**
            Removes all menu entries.

            @method clear
            */
      clear() {
        this.entries = {};
        queue.push({ action: 'clearMenu' });
      }
    }
  };

  ipcRenderer.on('mistAPI_callMenuFunction', (e, id) => {
    if (mist.menu.entries[id] && mist.menu.entries[id].callback) {
      mist.menu.entries[id].callback();
    }
  });

  ipcRenderer.on('uiAction_windowMessage', (e, type, error, value) => {
    console.log('uiAction_windowMessage', type, error, value);
    if (mist.callbacks[type]) {
      mist.callbacks[type].forEach(cb => {
        cb(error, value);
      });
      delete mist.callbacks[type];
    }
  });

  // work up queue every 500ms
  setInterval(() => {
    if (queue.length > 0) {
      ipcRenderer.sendToHost('mistAPI_menuChanges', queue);
      queue = [];
    }
  }, 500);

  return mist;
};
