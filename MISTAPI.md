# Mist API

## Requesting a provider

To integrate Ethereum into your dapp, you can learn how to request an [EthereumProvider](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md) in [EIP-1102: Opt-in Provider Access](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1102.md):

```js
// Request Ethereum Provider (EIP 1102)
window.addEventListener('message', event => {
  if (event.data && event.data.type === 'ETHEREUM_PROVIDER_SUCCESS') {
    start(window.ethereum);
  }
});
window.postMessage({ type: 'ETHEREUM_PROVIDER_REQUEST' }, this.origin);

function start(ethereum) {
  // A) Primary use case - set provider in web3.js
  web3.setProvider(ethereum);

  // B) Secondary use case - use provider object directly
  // See https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md#examples
}
```

If the user has previously authenticated your dapp, `window.ethereum` will be available on load.

## API

Mist provides an API for dapp developers to use special features available only in Mist.

You can check for the `mist` object in your dapp:

```js
if (typeof mist !== 'undefined') {
    ...
}
```

- [mist.platform](#mistplatform)
- [mist.requestAccounts](#mistrequestaccounts)
- [mist.createAccount](#mistcreateaccount)
- [mist.menu](#mistmenu)
- [mist.menu.add](#mistmenuaddid-options-callback)([id,] options, callback)
- [mist.menu.clear](#mistmenuclear)()
- [mist.menu.remove](#mistmenuremoveid)(id)
- [mist.menu.select](#mistmenuselectid)(text)
- [mist.menu.setBadge](#mistmenusetbadgetext)(text)
- [mist.menu.update](#mistmenuupdateid--options--callback)(id [, options][, callback])
- [mist.sounds](#mistsounds)
- [mist.sounds.bip](#mistsoundsbip)()
- [mist.sounds.bloop](#mistsoundsbloop)()
- [mist.sounds.invite](#mistsoundsinvite)()

### mist.platform

Returns the current platform Mist is running on:

- mac OS: `darwin`
- Windows: `win32`
- Linux: `linux`

---

### mist.requestAccounts

```js
mist.requestAccounts(): Promise<Array<String>|Error>
```

Request accounts from Mist.

If the user has already authenticated the dapp, the promise will immediately return. Otherwise, it will open a `Connect` modal for the user to choose which accounts to authenticate.

Returns a promise containing an array of the accounts' public keys, or an Error object.

#### Example

```js
mist
  .requestAccounts()
  .then(accounts => {
    console.log(`Accounts: ${accounts.join(', ')}`);
  })
  .catch(error => {
    console.error(`Error requesting accounts: ${error}`);
  });
```

### mist.createAccount

```js
mist.createAccount(): Promise<String|Error>
```

Open the `Create Account` dialog in Mist.

Returns a promise containing the new account's public key or an Error object.

#### Example

```js
mist
  .createAccount()
  .then(account => {
    console.log(`New account: ${account}`);
  })
  .catch(error => {
    console.error(`Error creating new account: ${error}`);
  });
```

### mist.menu

Provides functionality to control the sub menu of your dapp, when its added to the sidebar.

#### mist.menu.add([id,] options, callback)

Adds/Updates a sub menu entry, which is placed below you dapp button in the sidebar.

##### Parameters

1.  `String` **optional** and id string to identify your sub menu entry when updating.
2.  `Object` The menu options:
    - `name` (`String`): The name of the sub menu button.
    - `badge` (`String|null`) **optional**: The badge text for the sub menu button, e.g. `50`.
    - `position` (`Number`) **optional**: The position of the submenu button, `1` is on the top.
    - `selected` (`Boolean`) **optional**: Whether or not this sub menu entry is currently selected.
3.  `Function` **optional**: The callback to be called when the sub menu entry is clicked.

##### Minimal example

```js
mist.menu.add({ name: 'My account' });
```

##### Full example

```js
mist.menu.add(
  'tkrzU',
  {
    name: 'My Meny Entry',
    badge: 50,
    position: 1,
    selected: true
  },
  function() {
    // Redirect
    window.location = 'http://domain.com/send';
    // Using history pushstate
    history.pushState(null, null, '/my-entry');
    // In Meteor iron:router
    Router.go('/send');
  }
);
```

#### mist.menu.clear()

Removes all sub menu entries. You can use this when you reload your app,
to clear up incorrect menu entries, which might have been lost since the last session.

#### Parameters

None

#### mist.menu.remove(id)

Removes a sub menu entry.

#### Parameters

1.  `String` and id string to identify your sub menu.

#### mist.menu.select(id)

Selects the respective sub menu entry.

##### Parameters

1.  `String` the sub menu entry identifier.

---

#### mist.menu.setBadge(text)

Sets the main badge of your dapp, right below your dapps menu button.

##### Parameters

1.  `String` the string used as the badge text.

#### mist.menu.update(id, [, options][, callback])

Works like `mist.menu.add()`, but only the `id` parameter is required.

##### Parameters

1.  `String` and id string to identify your sub menu entry.
2.  `Object` The menu options:
    - `name` (`String`): (optional) The name of the sub menu button.
    - `badge` (`String|null`): (optional) The badge text for the sub menu button, e.g. `50`.
    - `position` (`Number`): (optional) The position of the submenu button, `1` is on the top.
    - `selected` (`Boolean`): (optional) Whether or not this sub menu entry is currently selected.
3.  `Function` (optional) The callback to be called when the sub menu entry is clicked.

##### Example

```js
mist.menu.update('tkrzU', {
  badge: 50,
  position: 2
});
```

#### mist.sounds

Provides a list of sounds.

#### mist.sounds.bip()

Makes a bip sound.

##### Parameters

None

#### mist.sounds.bloop()

Makes a bloop sound.

##### Parameters

None

#### mist.sounds.invite()

Makes an invite sound.

##### Parameters

None
