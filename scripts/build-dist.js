#!/usr/bin/env node
const builder = require('electron-builder');
const shell = require('shelljs');
const Q = require('bluebird');
const path = require('path');

const argv = require('yargs').parse(process.argv.slice(1));

const ROOT_FOLDER = path.resolve(__dirname, '..', '..');

const targets = [];

if (argv.mac) {
    targets.push(builder.Platform.MAC);
}

if (argv.win) {
    targets.push(builder.Platform.WINDOWS);
}

if (argv.linux) {
    targets.push(builder.Platform.LINUX);
}

builder.build({
    targets: builder.createTargets(targets, null, 'all'),
    devMetadata: {
        build: {
            afterPack(params) {
                return Q.try(() => {
                    console.log('Copying LICENSE, AUTHORS, README...');

                    shell.cp(
              path.join(ROOT_FOLDER, 'LICENSE'),
              params.appOutDir
            );

                    shell.cp(
              path.join(ROOT_FOLDER, 'AUTHORS'),
              params.appOutDir
            );

            // wallet readme
                    if (argv.type === 'wallet') {
                        shell.cp(
                path.join(ROOT_FOLDER, 'Wallet-README.txt'),
                path.join(params.appOutDir, 'README')
              );
                    }
                });
            },
        },
    },
})
.then(() => {
    process.exit(0);
})
.catch((err) => {
    console.error(err);

    process.exit(-1);
});
