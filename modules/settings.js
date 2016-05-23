const log = require('./utils/logger').create('Settings');


var _settings = {};


exports.get = function(key) {
    var value = _settings[key];

    log.trace('get', key, value);

    return value;
};


exports.set = function(key, value) {
    log.trace('set', key, value);

    _settings[key] = value;
};

