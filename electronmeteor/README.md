# Electrometeor
## Overview
Electrometeor combines **[Electron](http://electron.atom.io)** and **[Meteor](http://www.meteor.com)** to allow you to easily create desktop applications that work both 100% offline & online.

## Getting Started
#### Prerequisites
##### Mac & Linux
* None


##### Windows

* [nvm-windows](https://github.com/coreybutler/nvm-windows) - A node.js version management utility for Windows.
* [Cygwin](https://cygwin.com/) - Get that Linux feeling, on Windows ([here](http://smallbusiness.chron.com/run-cygwin-programs-cmdexe-50317.html) is a good article on getting it setup)
* [Python][windows-python] ([`v2.7.3`][windows-python-v2.7.3] recommended, `v3.x.x` is __*not*__ supported)
* Windows 7/8:
    * Microsoft Visual Studio C++ 2012/13 for Windows Desktop ([Express][msvc2012] version works well)

In order to get started, you'll need to clone this repo to `<your-app>` and run `npm install`
```sh
$ git clone git@github.com:sircharleswatson/Electrometeor.git <your-app>
$ cd <your-app>
$ npm install
```
(**Note:** You will also want to remove `.git` with the command: `$ rm -rf .git`)

##### Native Node Modules

>The native Node modules are supported by Electron, but since Electron is using a different V8 version from official Node, you have to manually specify the location of Electron's headers when building native modules.

Because of this, you will need to run `./node_modules/.bin/electron-rebuild` every time you run `npm install`. If you'd like to read more information you can check out the docs on [using native node modules](https://github.com/atom/electron/blob/master/docs/tutorial/using-native-node-modules.md).

Electrometeor takes advatage of [ShellJS](https://github.com/arturadib/shelljs) to make writing cross-platform bash scripts easier (or `.bat` for you Windows folks). Once you've installed the npm dependencies, you can run the setup script with node.

```sh
$ node ./script/setup.js
```

When that's all done, you can run the app locally with the following command:
```sh
$ node ./script/run.js
```

#### Developing your Meteor application

While the `run.js` script is active, you should be able to see any changes you make to your Meteor app in much the same way you would if you were developing a web app. In fact, you can even navigate to `http://localhost:3000` in your browser and you will see it there as well.

Development of your Meteor application is pretty much the same as usual. There are, however, some things you can do that you wouldn't normally be able to do with a web app. For example, you could use [node-applescript](https://github.com/TooTallNate/node-applescript) on the Meteor server to create an iTunes controller.

#### Deploying your Meteor application
##### Mac & Linux

When you're ready, you can build your app for distribution by running `node ./script/dist.js`.

##### Windows

Windows is a special child and needs lots of attention. These are the steps I have had to do in order to use the `dist.js` script.

1. Use the Visual Studio command prompt included with Microsoft Visual Studio C++ 2012/13
2. Before running the script, you need to run `nvm install 0.10.36`
3. Then _use_ v0.10.36: `nvm use 0.10.36`
4. Finally, run the script: `node ./script/dist.js`

The Windows version of node does not ship with the binaries so if you try to build for distribution with the wrong version of node, you will run into issues with Fibers and `node-gyp`. Let me know if you hit any snags in the build/dist process and I'll try to address them as soon as possible.

### Working with Electron
In its current form, Electrometeor is meant to be very simple. If you wish to develop the Electron side of things further in your app, please refer to their wonderful [docs](https://github.com/atom/electron/tree/master/docs).

## Goals for Electrometeor

My goal for Electrometeor is to create the best desktop application boilerplate for Meteor developers. It's very simple at the moment, but I intend on adding more features that Electron has in place for easily integrating apps with the desktop.

### Examples
If you use Electrometeor, please let me know and I will add your example here!

##### Electrometeor
![Electrometeor](https://github.com/sircharleswatson/Electrometeor/blob/master/electrometeor.gif)

Electrometeor comes with a basic example to demonstrate the reactivity of Meteor. This is the same example provided in all Meteor applications, with minor modifications to demonstrate _offline_ desktop functionality.

### Need Help?
Right now, I do not know much about Electron specifically, but I can try to answer any questions you may have. I'm also available for any questions you may have regarding Meteor. You can contact me through Gitter in the Electrometeor room or via direct message. Or leave a comment on the [Electrometeor Blog](https://sircharleswatson.github.io/2015/04/30/Electrometeor-Build-Desktop-Applications-With-Electron-Meteor.html) article.

[![Join the chat at https://gitter.im/sircharleswatson/Electrometeor](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/sircharleswatson/Electrometeor?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

#### TODO
* [x] Linux Distribution Support
* [x] Windows Distribution Support
* [ ] Menus
* [ ] Use [ShellJS](https://github.com/arturadib/shelljs) instead of bash scripts.
  * [x] setup.sh -> setup.js
  * [x] run.sh -> run.js
  * [x] dist.sh -> dist.js
  * [ ] colors.sh -> colors.js

#### Credits
Electrometeor is mostly made possible by reusing code from the [Kitematic](https://github.com/kitematic/kitematic) app. Also many thanks to GitHub for creating **[Electron](http://electron.atom.io)** and to MDG for all the work they do on **[Meteor](http://meteor.com)**


[windows-python]: http://www.python.org/getit/windows
[windows-python-v2.7.3]: http://www.python.org/download/releases/2.7.3#download
[msvc2012]: http://go.microsoft.com/?linkid=9816758
