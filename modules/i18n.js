/**
The i18n module, loads the language files and initializes i18next

@module i18n
*/
const i18n = require('i18next');


var i18nResources = {
  dev: { translation: require('../interface/i18n/mist.en.i18n.json') },
  en: { translation: require('../interface/i18n/mist.en.i18n.json') },            
  'en-US': { translation: require('../interface/i18n/mist.en.i18n.json') }
};

i18n.init({
    lng: global.language || 'en',
    resStore: i18nResources
});

module.exports = i18n;