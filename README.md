# Mist Browser

[![Join the chat at https://gitter.im/ethereum/mist](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/ethereum/mist?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Build status master branch ](https://build.ethdev.com/buildstatusimage?builder=Mist%20master%20branch)](https://build.ethdev.com/builders/Mist%20master%20branch/builds/-1)
[![Build status develop branch ](https://build.ethdev.com/buildstatusimage?builder=Mist%20develop%20branch)](https://build.ethdev.com/builders/Mist%20develop%20branch/builds/-1)

The Mist browser is the tool of choice to browse and use Ðapps.

For the Mist API see the [MISTAPI.md](MISTAPI.md).

## Installation

If you want install the app from a pre-built version on the [release page](https://github.com/ethereum/mist/releases),
you can simply run the executeable after download.

For updating simply download the new version and copy it over the old one (keep a backup of the old one if you want to be sure).
The data folder for Mist is stored in other places:

- Windows `%APPDATA%\Mist`
- MacOSX `~/Library/Application Support/Mist`
- Linux `~/.config/Mist`


## Development

For development, a Meteor server will to be started to assist with live reload and CSS injection.
Once a Mist version is released the Meteor frontend part is bundled using `meteor-build-client` npm package to create pure static files.

### Dependencies

Requirements: 

* Electron v1.2.5
* Node v4.3.0 or above

To run mist in development you need [Node.js NPM](https://nodejs.org) and [Meteor](https://www.meteor.com/install) and electron installed:

    $ curl https://install.meteor.com/ | sh
    $ npm install -g electron-prebuilt@1.2.5
    $ npm install -g gulp

### Installation

Now you're ready to install Mist:

    $ git clone https://github.com/ethereum/mist.git
    $ cd mist
    $ git submodule update --init
    $ npm install
    $ gulp update-nodes

To update Mist in the future, run:

    $ cd mist
    $ git pull && git submodule update
    $ npm install
    $ gulp update-nodes


### Run Mist

For development we start the interface with a Meteor server for autoreload etc.
*Start the interface in a separate terminal window:*

    $ cd mist/interface && meteor

In the original window you can then start Mist with:

    $ cd mist
    $ electron .


### Run the Wallet

Start the wallet app for development, *in a separate terminal window:*

    $ cd mist/interface && meteor

    // and in another terminal

    $ cd my/path/meteor-dapp-wallet/app && meteor --port 3050

In the original window you can then start Mist using wallet mode:

    $ cd mist
    $ electron . --mode wallet


### Connecting to node via HTTP instead of IPC

This is useful if you have a node running on another machine, though note that 
it's less secure than using the default IPC method.

```bash
$ electron . --rpc http://localhost:8545
```


### Passing options to Geth

You can pass command-line options directly to Geth by prefixing them with `--node-` in 
the command-line invocation:

```bash
$ electron . --mode mist --node-rpcport 19343 --node-networkid 2 
```

The `--rpc` Mist option is a special case. If you set this to an IPC socket file 
path then the `--ipcpath` option automatically gets set, i.e.:

```bash
$ electron . --rpc /my/geth.ipc
```

...is the same as doing...


```bash
$ electron . --rpc /my/geth.ipc --node-ipcpath /my/geth.ipc
```

### Using Mist with a privatenet

To run a private network you will need to set the IPC path, network id and data 
folder:

```bash
$ electron . --rpc ~/Library/Ethereum/geth.ipc --node-networkid 1234  --node-datadir ~/Library/Ethereum/privatenet
```

_NOTE: since `ipcpath` is also a Mist option you do not need to also include a 
`--node-ipcpath` option._

You can also run `geth` separately yourself with the same options prior to start 
Mist normally.


### Deployment


To create a binaries you need to install the following tools:

    // tools for the windows binaries
    $ brew install Caskroom/cask/xquartz
    $ brew install wine
    $ npm install -g meteor-build-client

To generate the binaries simply run:

    $ cd mist
    $ gulp update-nodes

    // to generate mist
    $ gulp mist

    // Or to generate the wallet (using the https://github.com/ethereum/meteor-dapp-wallet -> master)
    $ gulp wallet

This will generate the binaries inside the `dist_mist` or `dist_wallet` folder.

#### Options

##### platform

Additional you can only build the windows, linux or mac binary by using the `platform` option:

    $ gulp update-nodes --platform darwin

    // And
    $ gulp mist --platform darwin

    // Or
    $ gulp mist --platform "darwin win32"


Options are:

- `darwin` (Mac OSX)
- `win32` (Windows)
- `linux` (Linux)


##### walletSource

With the `walletSource` you can specify the branch to use, default ist `master`:

    $ gulp mist --walletSource develop


Options are:

- `master`
- `develop`
- `local` Will try to build the wallet from [mist/]../meteor-dapp-wallet/app

##### mist-checksums | wallet-checksums

Spits out the SHA256 checksums of zip files. The zip files need to be generated manually for now!
It expects zip files to be named as the generated folders e.g. `dist_wallet/Ethereum-Wallet-macosx-0-5-0.zip`

    $ gulp mist-checksums

    > SHA256 Ethereum-Wallet-linux32-0-5-0.zip: 983dc9f1bc14a17a46f1e34d46f1bfdc01dc0868
    > SHA256 Ethereum-Wallet-win32-0-5-0.zip: 1f8e56c198545c235d47921888e5ede76ce42dcf
    > SHA256 Ethereum-Wallet-macosx-0-5-0.zip: dba5a13d6114b2abf1d4beca8bde25f1869feb45
    > SHA256 Ethereum-Wallet-linux64-0-5-0.zip: 2104b0fe75109681a70f9bf4e844d83a38796311
    > SHA256 Ethereum-Wallet-win64-0-5-0.zip: fc20b746eb37686edb04aee3e442492956adb546

### Code signing for production

After the bundle run:

    $ codesign --deep --force --verbose --sign "5F515C07CEB5A1EC3EEB39C100C06A8C5ACAE5F4" Ethereum-Wallet.app

Verify

    $ codesign --verify -vvvv Ethereum-Wallet.app
    $ spctl -a -vvvv Ethereum-Wallet.app
