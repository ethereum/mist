# Mist API

Mist provides an API for dapp developers to use special features only available in Mist.

## Note for dapp developers

To make you dapp compatible with other browsers, its recommended that you check the `mist` object before you use it:

```js
if(typeof mist !== 'undefined') {
    ...
}
```

You have three different possibilities to use `web3`:

```js
// 1. Simply use web3 from mist
web3

// 2. Use web3 from Mist, OR load your own if you're outside of Mist
if(typeof web3 === 'undefined')
  web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

// 3. Use your own web3 version, but the provider from mist ("Web3" won't be supplied by Mist, so it should come from your packages)
if(typeof mist !== 'undefined')
  web3 = new Web3(mist.web3Provider);
else
  web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
```

## API


- [mist.platform](#mistmenuupdateid-options-callback)
- [mist.menu](#mistmenuupdateid-options-callback)
- [mist.menu.setBadge](#mistmenusetbadgetext)(text)
- [mist.menu.add](#mistmenuaddid-options-callback)(id, options, callback)
- [mist.menu.update](#mistmenuupdateid--options--callback)(id [, options] [, callback])
- [mist.menu.remove](#mistmenuremoveid)(id)
- [mist.menu.clear](#mistmenuclear)()


### mist.platform

Returns the current platform, mist is running on:

- `darwin` // Mac OSX
- `win32` // Windows
- `linux`

***

### mist.web3Provider

Returns the current mist provider, which should be used when using a different `Web3` version

#### Example

```js
web3 = new Web3(mist.web3Provider);
```

***

### mist.requestAccount(callback)

Asks the user to provide, or create a new account.

#### Parameters

1. `Function` The callback to be called with the new address as the second param

#### Example

```js
mist.requestAccount(function(e, address){
    console.log('Added new account', address);
});
```

***

### mist.menu

Provides functionality to control the sub menu of your dapp, when its add to the sidebar.

***

### mist.menu.setBadge(text)

Sets the main badge of your dapp, right below your dapps menu button.

#### Parameters

1. `String` the string used as the badge text

***

### mist.menu.add(id, options, callback)

Adds/Updates a sub menu entry, which is placed below you dapp button in the sidebar.

#### Parameters

1. `String` and id string to identify your sub menu entry when updating.
2. `Object` The menu options:
    - `name` (`String`): The name of the sub menu button.
    - `badge` (`String|null`): The badge text for the sub menu button, e.g. `50`
    - `position` (`Number`): The position of the submenu button, `1` is on the top.
    - `selected` (`Boolean`): whether or not this sub menu entry is currently selected.
3. `Function` The callback to be called when the sub menu entry is clicked

#### Example

```js
mist.menu.add('tkrzU', {
    name: 'My Meny Entry',
    badge: 50,
    position: 1,
    selected: true
}, function(){
    // Redirect
    window.location = 'http://domain.com/send';
    // Using history pushstate
    history.pushState(null, null, '/my-entry');
    // In Meteor iron:router
    Router.go('/send');
})
```

***

### mist.menu.update(id, [, options] [, callback])

Works like `mist.menu.add()`, but all but the `id` parameters are optional.

#### Parameters

1. `String` and id string to identify your sub menu entry.
2. `Object` The menu options:
    - `name` (`String`): (optional) The name of the sub menu button.
    - `badge` (`String|null`): (optional) The badge text for the sub menu button, e.g. `50`
    - `position` (`Number`): (optional) The position of the submenu button, `1` is on the top.
    - `selected` (`Boolean`): (optional) whether or not this sub menu entry is currently selected.
3. `Function` (optional) The callback to be called when the sub menu entry is clicked

#### Example

```js
mist.menu.update('tkrzU', {
    badge: 50,
    position: 2,
})
```

***

### mist.menu.remove(id)

Removes a sub menu entry.

#### Parameters

1. `String` and id string to identify your sub menu.

***

### mist.menu.clear()

Removes all sub menu entries. You can use this when you reload your app,
to clear up wrong menu entries, which might got lost since the last session.

#### Parameters

None

***


### mist.sounds

Provides a list of sounds

***

### mist.sounds.bip()

Makes a bip counds

#### Parameters

None

***

