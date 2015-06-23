# Mist API

Mist provides an API for dapp developers to use special features only available in Mist.

## Note for dapp developers

To make you dapp compatible with other browsers, its recommended that you check the `mist` object before you use it:

```js
if(typeof mist !== 'undefined') {
    ...
}
```

Additionally mist provides the `web3` object, to make sure you use the mist connection, check the providor before you set your own:

```js
// set providor
if(!web3.currentProvidor)
    web3.setProvider(new web3.providers.HttpProvider("http://localhost:8545"));
```

## API

### mist.menu

Provides functionality to control the sub menu of your dapp, when its add to the sidebar.

***

### mist.menu.setBadge(text)

Sets the main badge of your dapp, right below your dapps menu button.

#### Parameters

1. `String` the string used as the badge text

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

### mist.menu.update(id, options, callback)

Works like `mist.menu.add()`, but all but the `id` parameters are optional.

#### Parameters

1. `String` and id string to identify your sub menu entry.
2. `Object` The menu options:
    - `name` (`String`): The name of the sub menu button.
    - `badge` (`String|null`): The badge text for the sub menu button, e.g. `50`
    - `position` (`Number`): The position of the submenu button, `1` is on the top.
    - `selected` (`Boolean`): whether or not this sub menu entry is currently selected.
3. `Function` The callback to be called when the sub menu entry is clicked

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

