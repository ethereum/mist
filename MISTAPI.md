# Mist API

## Using the Provider

An Ethereum Provider as specified in [EIP-1193](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md) is available on `window.ethereum`.

Call `window.ethereum.enable()` to enable a full provider with authenticated account(s). It returns a promise that resolves with an array of the authenticated accounts' public key(s), or rejects with error [4001: User Denied Full Provider](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md#error-object-and-codes).

### window.mist.createAccount

```js
window.mist.createAccount(): Promise<String>
```

Opens the `Create Account` dialog in Mist.

Returns a promise that resolves with the new account's public key, or rejects with an Error object.

#### Example

```js
window.mist
  .createAccount()
  .then(account => {
    console.log(`New account: ${account}`);
  })
  .catch(error => {
    console.error(`Error creating new account: ${error}`);
  });
```
