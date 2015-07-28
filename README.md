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

### Run

For development we start the interface with a Meteor server for autoreload. In a separate window, start Meteor:

    $ cd interface && meteor

In the original window you can then start Mist with:

    $ electron ./

### Deployment

    $ npm install -g meteor-build-client
    $ cd mist/interface
    $ meteor-build-client ../interface_build --path ""
    $ change the `global.production` variable to `true` in the main.js

TODO: Add a gulp/npm script:

    - build meteor-client (add also i18n folder!) (meteor-build-client ../interface_build -g "")
    - get electron dist app
    - copy all besides "dist" and "interface" into the "electron.app/Contents/Resources/app" folder
    - delete "interface"
    - rename "interface_build" to "interface"
    - change variable name "global.production = false" to "global.production = true" in main.js

    // mac
    - change names of `CFBundleDisplayName`, `CFBundleIdentifier`, `CFBundleName` in "electron.app/Contents/Info.plist" to "Mist", also change icon file
    - change names of `CFBundleDisplayName`, `CFBundleIdentifier`, `CFBundleName` in "electron.app/Contents/Frameworks/Electron Helper.app/Contents/Info.plist" to "Mist"






