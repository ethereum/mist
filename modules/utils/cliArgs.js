"use strict";

const argv = require('yargs')
    .usage('Usage: $0 [Mist Options]')
    .option({
        m: {
            alias: 'mode',
            demand: false,
            default: 'mist',
            describe: 'App mode: wallet, mist.',
            requiresArg: true,
            nargs: 1,
            type: 'string',
            group: 'Mist options:',
        },
        gethpath: {
            demand: false,
            describe: 'Path to geth executable to use instead of default.',
            requiresArg: true,
            nargs: 1,
            type: 'string',
            group: 'Mist options:',
        },
        ethpath: {
            demand: false,
            describe: 'Path to eth executable to use instead of default.',
            requiresArg: true,
            nargs: 1,
            type: 'string',
            group: 'Mist options:',
        },
        'ignore-gpu-blacklist': {
            demand: false,
            describe: 'Ignores GPU blacklist (needed for some Linux installations).',
            requiresArg: false,
            nargs: 0,
            type: 'boolean',
            group: 'Mist options:',
        },
        'reset-tabs': {
            demand: false,
            describe: 'Reset Mist tabs to their default settings.',
            requiresArg: false,
            nargs: 0,
            type: 'boolean',
            group: 'Mist options:',            
        },
        logfile: {
            demand: false,
            describe: 'Logs will be written to this file in addition to the console.',
            requiresArg: true,
            nargs: 1,
            type: 'string',
            group: 'Mist options:',            
        },
        loglevel: {
            demand: false,
            default: 'info',
            describe: 'Minimum logging threshold: trace (all logs), debug, info, warn, error.',
            requiresArg: true,
            nargs: 1,
            type: 'string',
            group: 'Mist options:',                        
        },
        v: {
            alias: 'version',
            demand: false,
            requiresArg: false,
            nargs: 0,
            describe: 'Display Mist version.',
            group: 'Mist options:',
            type: 'boolean',
        },
    })
    .help('h')
    .alias('h', 'help')
    .parse(process.argv.slice(1));




exports.getArgs = function() {
    console.log(argv);
    return argv;
};




