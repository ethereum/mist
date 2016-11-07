/**
The i18n module, loads the language files and initializes i18next

@module i18n
*/
const fs = require('fs');
const i18n = require('i18next');

let i18nConf = fs.readFileSync(`${__dirname}/../interface/project-tap.i18n`);
i18nConf = JSON.parse(i18nConf);

const resources = {
    dev: { translation: require('../interface/i18n/mist.en.i18n.json') },
};

// add supported languages
i18nConf.supported_languages.forEach((lang) => {
    resources[lang] = { translation: require(`../interface/i18n/mist.${lang}.i18n.json`) };
});

/**
* Given a language code, get best matched code from supported languages.
*
* > getBestMatchedLangCode('en-US')
* 'en'
* > getBestMatchedLangCode('zh-TW')
* 'zh-TW'
* > getBestMatchedLangCode('no-such-code')
* 'en'
*/
i18n.getBestMatchedLangCode = function (langCode) {
    const codeList = Object.keys(resources);
    let bestMatchedCode = langCode;
    if (codeList.indexOf(langCode) === -1) {
        if (codeList.indexOf(langCode.substr(0, 2)) > -1) {
            bestMatchedCode = langCode.substr(0, 2);
        } else {
            bestMatchedCode = 'en';
        }
    }
    return bestMatchedCode;
};


// init i18n
i18n.init({
    lng: global.language || 'en',
    resources,
    interpolation: { prefix: '__', suffix: '__' },
});

module.exports = i18n;
