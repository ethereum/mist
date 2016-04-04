/**
The i18n module, loads the language files and initializes i18next

@module i18n
*/
const fs = require('fs');
const i18n = require('i18next');
var i18nConf = fs.readFileSync(__dirname + '/../interface/project-tap.i18n');
i18nConf = JSON.parse(i18nConf);

var resources = {
    dev: { translation: require('../interface/i18n/mist.en.i18n.json') },
};

// add supported languages
i18nConf.supported_languages.forEach(function(lang) {
    resources[lang] = { translation: require('../interface/i18n/mist.'+ lang +'.i18n.json') };
});


// init i18n
i18n.init({
    lng: global.language || 'en',
<<<<<<< HEAD
    resources: resources,
    interpolation: {prefix: '__', suffix: '__'}
=======
    resources: {
        dev: { translation: require('../interface/i18n/mist.en.i18n.json') },
        en: { translation: require('../interface/i18n/mist.en.i18n.json') },            
        de: { translation: require('../interface/i18n/mist.de.i18n.json') },            
        pt: { translation: require('../interface/i18n/mist.pt.i18n.json') },            
        fr: { translation: require('../interface/i18n/mist.fr.i18n.json') },            
    }
>>>>>>> develop
});

module.exports = i18n;