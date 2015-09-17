Ethereum Wallet

The ethereum wallet, which allows you to create simple and multisig wallets to manage your ether.


Currently you need an instance of `geth` running when you want to use the wallet.


## NOTES

- The wallet is currently in an alpha testing phase and its not recommended to use it to store real ether!
- You can use it on the mainnet, but make sure you try with only small amounts


## Running on a testnet

When you start the wallet on a testnet (e.g. different `--datadir`) you need to make sure to set the `--ipcpath` back to the original one.
On OSX its `/Users/<you>/Library/Ethereum/geth.ipc` on linux `/Users/<you>/.thereum/geth.ipc` and on windows it uses a named pipe, which doesn't need to be renamed.

Example:

    $ geth --datadir /my/chain/ --networkid 23 --ipcpath /Users/<you>/Library/Ethereum/geth.ipc



### Original contract

Once you start the app while running a testnet, the wallet need to deploy an original contract,
which will be used by the wallet contracts you create.

The point of the original wallet is that wallet contract creation is cheaper,
as not the full code has to be deployed for every wallet.

You need to make sure that the account displayed for the original wallet creation is unlocked and has at least 1 ether.



## Issues

If you find issues or have suggestion, please report them at  
https://github.com/ethereum/meteor-dapp-wallet/issues



## Repository

The wallet code can be found at   
https://github.com/ethereum/meteor-dapp-wallet

And the binary application code, which wraps the wallet app can be found at   
https://github.com/ethereum/mist/tree/wallet



## Bundling the wallet

To bundle the binaries yourself follow the instructions on the mist#wallet readme  
https://github.com/ethereum/mist/tree/wallet#deployment
