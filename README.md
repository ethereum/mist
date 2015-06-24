# Mist Browser

[![Join the chat at https://gitter.im/ethereum/mist](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/ethereum/mist?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

The Mist browser is the tool of choice to browse and use Ðapps.


## Development

To run mist in development you need [Node.js NPM](https://nodejs.org) and [Meteor](https://www.meteor.com/install) installed

Then install electron and initialize the git submodules:

    $ npm install -g electron-prebuilt
    $ git submodule update --init

Start the mist UI interface first using Meteor:

    $ cd mist/interface
    $ npm install
    $ meteor

And then in another terminal window start mist with:

    $ cd mist
    $ electron ./