"use strict";

const electron = require('electron');
const protocol = electron.protocol;
const path = require('path');
const Settings = require('./settings');
const log = require('./utils/logger').create('customProtocols');


const protocols = {
    mist: (req, cb) => {
        const url = (req.url.indexOf('mist://interface') !== -1) 
            ? global.interfaceAppUrl + req.url.replace('mist://interface','') 
            : '';
        
        log.debug('[mist]', url);

        var call = {
            url: url,
            method: req.method,
            referrer: req.referrer
        };

        cb(call);
    },
    bzz: (req, cb) => {
        // bzz://abc -> abc
        const subpath = req.url.substring(6);
        const url = `${Settings.bzzHost}/bzz:/${subpath}`;
        
        log.debug('[bzz]', url);
        
        cb({url: url, method: "GET"});
    },
};


for (let key in protocols) {    
    protocol.registerHttpProtocol(key, protocols[key], (err) => {
        if (err) {
            log.error(`Failed to register ${key} protocol, error: `, err);
        } else {
            log.info(`Registered ${key} protocol.`);
        }
    });    
}
