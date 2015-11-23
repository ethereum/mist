# Mist Browser

**NOTE** Mist is under heavy development and not intended to be tested by the community yet,
therefore it might not run out of the box as described the the README below.
To save us time getting you all up and running, better wait for now. Thanks :)

[![Join the chat at https://gitter.im/ethereum/mist](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/ethereum/mist?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

The Mist browser is the tool of choice to browse and use Ðapps.

For the mist API see the [MISTAPI.md](MISTAPI.md).


## Development

For development, a Meteor needs to be started to assist with live reload and CSS injection.
Once a Mist version is released the Meteor frontend part is bundled using `meteor-build-client` npm package to create pure static files.

### Dependencies

To run mist in development you need [Node.js NPM](https://nodejs.org) and [Meteor](https://www.meteor.com/install) installed. When this is done, install Electron:

    $ npm install -g electron-prebuilt
    $ curl https://install.meteor.com/ | sh

### Installation

Now you're ready to install Mist:

    $ git clone https://github.com/ethereum/mist.git
    $ cd mist
    $ git submodule update --init 
    $ npm install

To update Mist in the future, run:

    $ git pull
    $ git submodule update
    $ npm update


### Run Mist

Switch the `global.mode` to `"mist"` in the `main.js`.

For development we start the interface with a Meteor server for autoreload etc. Start the interface in a separate terminal window:

    $ cd interface && meteor

In the original window you can then start Mist with:

    $ electron ./


### Run the Wallet

Switch the `global.mode` to `"wallet"` in the `main.js`.

Start the wallet app for development, in a separate terminal window:

    $ cd interface && meteor

    // and in another terminal

    $ cd my/path/meteor-dapp-wallet/app && meteor --port 3050

In the original window you can then start Mist with:

    $ electron ./

### Using Mist with a testnet

To run a testnet you need to have `geth` installed separately and run it with the `ipcpath` flag:

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



