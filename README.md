# Mist Browser

**NOTE** Mist is under heavy development and not intended to be tested by the community yet,
therefore it might not run out of the box as described the the README below.
Stay tuned and check back later...

[![Join the chat at https://gitter.im/ethereum/mist](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/ethereum/mist?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

The Mist browser is the tool of choice to browse and use Ðapps.

For the mist API see the [MISTAPI.md](MISTAPI.md).


## Development

For development, a Meteor needs to be started to assist with live reload and CSS injection.
Once a Mist version is released the Meteor frontend part is bundled using `meteor-build-client` npm package to create pure static files.

### Dependencies

To run mist in development you need [Node.js NPM](https://nodejs.org) and [Meteor](https://www.meteor.com/install) installed. When this is done, install Electron:

    $ npm install -g electron-prebuilt

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

Developing is much easier when relying on Meteor's autoreload. In a separate window, start Meteor:

    $ cd interface && meteor

In the original window you can then start Mist with:

    $ electron ./

### Deployment

    $ npm install -g meteor-build-client
    $ cd mist/interface
    $ meteor-build-client ../interface-build --path ""
