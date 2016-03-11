# Mist Browser

**NOTE** Mist is under heavy development and not intended to be tested by the community yet,
therefore it might not run out of the box as described in the README below.
To save us time getting you all up and running, better wait for now. Thanks :)

[![Join the chat at https://gitter.im/ethereum/mist](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/ethereum/mist?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Build status master branch ](https://build.ethdev.com/buildstatusimage?builder=Mist%20master%20branch)](https://build.ethdev.com/builders/Mist%20master%20branch/builds/-1)
[![Build status develop branch ](https://build.ethdev.com/buildstatusimage?builder=Mist%20develop%20branch)](https://build.ethdev.com/builders/Mist%20develop%20branch/builds/-1)

The Mist browser is the tool of choice to browse and use Ðapps.

For the mist API see the [MISTAPI.md](MISTAPI.md).

## Installation

If you want install the app from a pre-built version on the [release page](https://github.com/ethereum/mist/releases),
you can simply run the executeable after download.

For updating simply download the new version and copy it over the old one (keep a backup of the old one if you want to be sure).
The data folder for Mist is stored in other places:

- Windows `%APPDATA%/Roaming/Mist`
- MacOSX `~/Library/Application Support/Mist`
- Linux `~/.config/Mist`


## Development

For development, a Meteor server will to be started to assist with live reload and CSS injection.
Once a Mist version is released the Meteor frontend part is bundled using `meteor-build-client` npm package to create pure static files.

### Dependencies

Requires electron version 0.35.2

To run mist in development you need [Node.js NPM](https://nodejs.org) and [Meteor](https://www.meteor.com/install) and electron installed:

    $ curl https://install.meteor.com/ | sh
    $ npm install -g electron-prebuilt

### Installation

Now you're ready to install Mist:

    $ git clone https://github.com/ethereum/mist.git
    $ cd mist
    $ git submodule update --init
    $ npm install

To update Mist in the future, run:

    $ cd mist
    $ git pull && git submodule update


### Run Mist

Switch the `global.mode` to `"mist"` in the `main.js`.

For development we start the interface with a Meteor server for autoreload etc.
*Start the interface in a separate terminal window:*

    $ cd mist/interface && meteor

In the original window you can then start Mist with:

    $ cd mist
    $ electron .


### Run the Wallet

Switch the `global.mode` to `"wallet"` in the `main.js`.

Start the wallet app for development, *in a separate terminal window:*

    $ cd mist/interface && meteor

    // and in another terminal

    $ cd my/path/meteor-dapp-wallet/app && meteor --port 3050

In the original window you can then start Mist with:

    $ cd mist
    $ electron .


### Using Mist with a privatenet

To run a privatenet you need to have `geth` installed separately and run it with the `ipcpath` flag:

    $ geth --networkid 1234 --ipcpath /Users/you/Library/Ethereum/geth.ipc --datadir ...


### Deployment


To create a binaries you need to install the following tools:

    // tools for the windows binaries
    $ brew install Caskroom/cask/xquartz
    $ brew install wine

    // install meteor-build-client
    $ npm install -g meteor-build-client

    // install gulp
    $ npm install -g gulp

To generate the binaries simply run:

    $ cd mist
    $ gulp mist

    // Or to generate the wallet (using the https://github.com/ethereum/meteor-dapp-wallet -> master)
    $ gulp wallet

This will generate the binaries inside the `dist_mist` or `dist_wallet` folder.

#### Options

##### platform

Additional you can only build the windows, linux or mac binary by using the `platform` option:

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

Spits out the SHASUM and MD5 checksums of zip files. The zip files need to be generated manually for now!
It expects zip files to be named as the generated folders e.g. `dist_wallet/Ethereum-Wallet-macosx-0-5-0.zip`

    $ gulp mist-checksums

    > MD5 Ethereum-Wallet-win32-0-5-0.zip: 8ce2a562e8cfa77f2283d8b689732d59
    > MD5 Ethereum-Wallet-linux32-0-5-0.zip: 6bbd5876d59f23eec018a204d3a08dc8
    > MD5 Ethereum-Wallet-linux64-0-5-0.zip: 551cc4cf95c81b0faebf8460d155e041
    > MD5 Ethereum-Wallet-macosx-0-5-0.zip: 5e781413a9880e78acd3ff396b4ce39a
    > MD5 Ethereum-Wallet-win64-0-5-0.zip: 332e71f57aa2dac2fb8db8f6f87cda21

    > SHASUM Ethereum-Wallet-linux32-0-5-0.zip: 983dc9f1bc14a17a46f1e34d46f1bfdc01dc0868
    > SHASUM Ethereum-Wallet-win32-0-5-0.zip: 1f8e56c198545c235d47921888e5ede76ce42dcf
    > SHASUM Ethereum-Wallet-macosx-0-5-0.zip: dba5a13d6114b2abf1d4beca8bde25f1869feb45
    > SHASUM Ethereum-Wallet-linux64-0-5-0.zip: 2104b0fe75109681a70f9bf4e844d83a38796311
    > SHASUM Ethereum-Wallet-win64-0-5-0.zip: fc20b746eb37686edb04aee3e442492956adb546

### Code signing for production

After the bundle run:

    $ codesign --deep --force --verbose --sign "5F515C07CEB5A1EC3EEB39C100C06A8C5ACAE5F4" Ethereum-Wallet.app

Verify

    $ codesign --verify -vvvv Ethereum-Wallet.app
    $ spctl -a -vvvv Ethereum-Wallet.app
