/**
The i18n module, loads the language files and initializes i18next

@module i18n
*/
const i18n = require('i18next');

i18n.init({
    lng: global.language || 'en',
    resources: {
        dev: { translation: require('../interface/i18n/mist.en.i18n.json') },
        en: { translation: require('../interface/i18n/mist.en.i18n.json') },            
        de: { translation: require('../interface/i18n/mist.de.i18n.json') },            
        pt: { translation: require('../interface/i18n/mist.pt.i18n.json') },            
        fr: { translation: require('../interface/i18n/mist.fr.i18n.json') },            
    }
});

module.exports = i18n;