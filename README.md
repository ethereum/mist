# Mist Browser

The Mist browser is the tool of choice to browse and use Ðapps.


## Development

To run install electron:

    $ npm install -g electron-prebuilt

Start the meteor interface first:

    $ cd mist/interface/public
    $ git clone https://github.com/ethereum/dapp-styles
    $ cd ..
    $ meteor

And then in another terminal window start mist with:

    $ cd mist
    $ electron ./