# Mist Browser<sup>beta</sup>

[![Github All Releases](https://img.shields.io/github/downloads/ethereum/mist/total.svg)](http://www.somsubhra.com/github-release-stats/?username=ethereum&repository=mist)
[![Build Status develop branch](https://travis-ci.org/ethereum/mist.svg?branch=develop)](https://travis-ci.org/ethereum/mist)
[![CircleCI](https://circleci.com/gh/ethereum/mist/tree/develop.svg?style=svg)](https://circleci.com/gh/ethereum/mist/tree/develop)
[![Greenkeeper badge](https://badges.greenkeeper.io/ethereum/mist.svg)](https://greenkeeper.io/)
[![Join the chat at https://gitter.im/ethereum/mist](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/ethereum/mist)
[![Code Triagers Badge](https://www.codetriage.com/ethereum/mist/badges/users.svg)](https://www.codetriage.com/ethereum/mist)

The Mist browser is the tool of choice to browse and use Ðapps.

For the Mist API see [MISTAPI.md](MISTAPI.md).

This repository is also the Electron host for the [Meteor-based wallet dapp](https://github.com/ethereum/meteor-dapp-wallet).

## Help and troubleshooting

In order to get help regarding Mist or Ethereum Wallet:

1.  Please check the [Mist troubleshooting guide](https://github.com/ethereum/mist/wiki).
1.  Go to our [Gitter channel](https://gitter.im/ethereum/mist) to connect with the community for instant help.
1.  Search for [similar issues](https://github.com/ethereum/mist/issues?q=is%3Aopen+is%3Aissue+label%3A%22Type%3A+Canonical%22) and potential help.
1.  Or create a [new issue](https://github.com/ethereum/mist/issues) and provide as much information as you can to recreate your problem.

## How to contribute

Contributions via Pull Requests are welcome. You can see where to help looking for issues with the [Enhancement](https://github.com/ethereum/mist/issues?q=is%3Aopen+is%3Aissue+label%3A%22Type%3A+Enhancement%22) or [Bug](https://github.com/ethereum/mist/issues?q=is%3Aopen+is%3Aissue+label%3A%22Type%3A+Bug%22) labels. We can help guide you towards the solution.

You can also help by [responding to issues](https://github.com/ethereum/mist/issues?q=is%3Aissue+is%3Aopen+label%3A%22Status%3A+Triage%22). Sign up on [CodeTriage](https://www.codetriage.com/ethereum/mist) and it'll send you gentle notifications with a configurable frequency. It is a nice way to help while learning.

## Installation

If you want to install the app from a pre-built version on the [release page](https://github.com/ethereum/mist/releases), you can simply run the executable after download.

For updating, simply download the new version and copy it over the old one (keep a backup of the old one if you want to be sure).

#### Linux .zip installs

In order to install from .zip files, please install `libgconf2-4` first:

```bash
apt-get install libgconf2-4
```

### Config folder

The data folder for Mist depends on your operating system:

- Windows `%APPDATA%\Mist`
- macOS `~/Library/Application\ Support/Mist`
- Linux `~/.config/Mist`

## Development

For development, a Meteor server assists with live reload and CSS injection.

Once a Mist version is released the Meteor frontend part is bundled using the `meteor-build-client` npm package to create pure static files.

### Dependencies

To run mist in development you need:

- [Node.js](https://nodejs.org) `v7.x` (use the preferred installation method for your OS)
- [Meteor](https://www.meteor.com/install) javascript app framework
- [Yarn](https://yarnpkg.com/) package manager

Install the latter ones via:

```bash
$ curl https://install.meteor.com/ | sh
$ curl -o- -L https://yarnpkg.com/install.sh | bash
```

### Initialization

Now you're ready to initialize Mist for development:

```bash
$ git clone https://github.com/ethereum/mist.git
$ cd mist
$ yarn
```

To update Mist in the future, run:

```bash
$ cd mist
$ git pull
$ yarn
```

### Run Mist

For development we start the interface with a Meteor server for auto-reload etc.

_Start the interface in a separate terminal window:_

```bash
$ yarn dev:meteor
```

In the original window you can then start Mist with:

```bash
$ cd mist
$ yarn dev:electron
```

_NOTE: Client binaries (e.g. [geth](https://github.com/ethereum/go-ethereum)) specified in [clientBinaries.json](https://github.com/ethereum/mist/blob/master/clientBinaries.json) will be checked during every startup and downloaded if out-of-date, binaries are stored in the [config folder](#config-folder)._

_NOTE: use `--help` to display available options, e.g. `--loglevel debug` (or `trace`) for verbose output_

### Run the Wallet

Start the wallet app for development, _in a separate terminal window:_

```bash
$ yarn dev:meteor
```

In another terminal:

```bash
$ cd my/path/meteor-dapp-wallet/app && meteor --port 3050
```

In the original window you can then start Mist using wallet mode:

```bash
$ cd mist
$ yarn dev:electron --mode wallet
```

### Connect your own node

This is useful if you are already running your own node or would like to connect with a private or development network.

```bash
$ yarn dev:electron --rpc path/to/geth.ipc
```

### Passing options to Geth

You can pass command-line options directly to Geth by prefixing them with `--node-` in
the command-line invocation:

```bash
$ yarn dev:electron --mode mist --node-rpcport 19343 --node-networkid 2
```

The `--rpc` Mist option is a special case. If you set this to an IPC socket file
path then the `--ipcpath` option automatically gets set, i.e.:

```bash
$ yarn dev:electron --rpc path/to/geth.ipc
```

...is the same as doing...

```bash
$ yarn dev:electron --rpc /my/geth.ipc --node-ipcpath /path/to/geth.ipc
```

### Creating a local private net

If you would like to quickly set up a local private network on your computer, run:

```bash
geth --dev
```

Look for the IPC path in the resulting geth output, then start Mist with:

```bash
$ yarn dev:electron --rpc path/to/geth.ipc
```

### Deployment

Our build system relies on [gulp](http://gulpjs.com/) and [electron-builder](https://github.com/electron-userland/electron-builder/).

#### Dependencies

Cross-platform builds require additional [`electron-builder` dependencies](https://www.electron.build/multi-platform-build).

##### macOS

```bash
$ brew install rpm
```

##### Windows

```bash
$ brew install wine --without-x11 mono makensis
```

##### Linux

```bash
$ brew install gnu-tar libicns graphicsmagick xz
```

#### Generate packages

To generate the binaries for Mist run:

```bash
$ gulp
```

To generate the Ethereum Wallet:

```bash
$ gulp --wallet
```

The generated binaries will be under `dist_mist/release` or `dist_wallet/release`. From 0.11.0, both Ethereum Wallet and Mist bundle a meteor-dapp-wallet instance (https://github.com/ethereum/meteor-dapp-wallet).

#### Options

##### platform

To build binaries for specific platforms (default: all available) use the following flags:

```bash
$ gulp --mac      # mac
$ gulp --linux    # linux
$ gulp --win      # windows
```

##### walletSource

With the `walletSource` you can specify the Wallet branch to use, default is `master`:

    $ gulp --wallet --walletSource local

Options are:

- `master`
- [any meteor-dapp-wallet branch](https://github.com/ethereum/meteor-dapp-wallet/branches)
- `local` Will try to build the wallet from [mist/]../meteor-dapp-wallet/app

_Note: applicable only when combined with `--wallet`_

##### skipTasks

When building a binary, you can optionally skip some tasks — generally for testing purposes.

```bash
$ gulp --mac --skipTasks=bundling-interface,release-dist
```

##### Checksums

Spits out the MD5 checksums of the distributables.

It expects installer/zip files to be in the generated folders e.g. `dist_mist/release`

```bash
$ gulp checksums [--wallet]
```

#### Cutting a release

1.  Install [release](https://github.com/zeit/release) globally:

    ```bash
    $ yarn global add release
    ```

2.  Create a git tag and a GitHub release:

    ```bash
    $ release <major|minor|patch>
    ```

3.  A generated release draft will open in the default browser. Edit the information and add assets as necessary.

## Testing

Tests run using [Spectron](https://github.com/electron/spectron/), a webdriver.io runner built for Electron.

First make sure to build Mist with:

```bash
$ gulp
```

Then run the tests:

```bash
$ gulp test
```

_Note: Integration tests are not yet supported on Windows._
