# How to Contribute

## Issues / Bug reports

**Prior to submitting, please search -and read- _both_ open and closed issues -as _it_ may already exist.**

To help improve Mist (_Ethereum Wallet_), please include the following:

- What do you run? (_Binary version from [releases](https://github.com/ethereum/mist/releases) or a development version from the [commandline](https://github.com/ethereum/mist#run-mist)_)
- Which version do you use? (_Check the `VERSION` file in the Mist folder_)
- What OS you're on?

If applicable:

- Log file (Linux: `~/.config/Mist/logs/all.log`, Windows: `%APPDATA%/Roaming/Mist/logs/all.log`, MacOSX: `~/Library/Application Support/Mist/logs/all.log`)
- Screenshot (for GUI related issues)

## Pull Requests

If you want to make a PR please make sure you add a understandable description of what it is you're adding/changing/fixing.

For formatting we use 2 _spaces_ as indentation.

If you add any modules or files, please give them a module description and or a class description:

```
/**
The IPC provider backend filter and tunnel all incoming request to the IPC geth bridge.

@module ipcProviderBackend
*/

/**
Mist API

Provides an API for all dapps, which specifically targets features from the Mist browser

@class mist
@constructor
*/
```
