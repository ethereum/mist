# Mist Browser

**NOTE** Mist is under heavy development and not intended to be tested by the community yet,
therefore it might not run out of the box as described the the README below.
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


### Code signing for production

After the bundle run:

    $ codesign --deep --force --verbose --sign "5F515C07CEB5A1EC3EEB39C100C06A8C5ACAE5F4" Ethereum-Wallet.app

Verify

    $ codesign --verify -vvvv Ethereum-Wallet.app
    $ spctl -a -vvvv Ethereum-Wallet.app
