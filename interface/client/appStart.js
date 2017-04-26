/**
The init function of Mist

@method mistInit
*/
mistInit = function () {
    console.info('Initialise Mist Interface');

    EthBlocks.init();

    Tabs.onceSynced.then(function () {
        if (location.search.indexOf('reset-tabs') >= 0) {
            console.info('Resetting UI tabs');

            Tabs.remove({});
        }

        if (!Tabs.findOne('browser')) {
            console.debug('Insert tabs');

            Tabs.insert({
                _id: 'browser',
                url: 'https://ethereum.org',
                redirect: 'https://ethereum.org',
                position: 0
            });
        } else {
            Tabs.upsert(
                { _id: 'browser' },
                {
                    $set: { position: 0 }
                }
            );
        }

        // overwrite wallet on start again, but use $set to dont remove titles
        Tabs.upsert(
            { _id: 'wallet' },
            {
                $set: {
                    url: 'https://wallet.ethereum.org',
                    redirect: 'https://wallet.ethereum.org',
                    position: 1,
                    permissions: {
                        admin: true
                    }
                }
            });

        // Sets browser as default tab if:
        // 1) there's no record of selected tab
        // 2) data is corrupted (no saved tab matches localstore)
        if (!LocalStore.get('selectedTab') || !Tabs.findOne(LocalStore.get('selectedTab'))) {
            LocalStore.set('selectedTab', 'wallet');
        }
    });
};


Meteor.startup(function () {
    console.info('Meteor starting up...');

    if (!location.hash) {  // Main window
        EthAccounts.init();
        mistInit();
    }

    console.debug('Setting language');

    // SET default language
    if (Cookie.get('TAPi18next')) {
        TAPi18n.setLanguage(Cookie.get('TAPi18next'));
    } else {
        const userLang = navigator.language || navigator.userLanguage;
        const availLang = TAPi18n.getLanguages();

        // set default language
        if (_.isObject(availLang) && availLang[userLang]) {
            TAPi18n.setLanguage(userLang);
        } else if (_.isObject(availLang) && availLang[userLang.substr(0, 2)]) {
            TAPi18n.setLanguage(userLang.substr(0, 2));
        } else {
            TAPi18n.setLanguage('en');
        }
    }
    // change moment and numeral language, when language changes
    Tracker.autorun(function () {
        if (_.isString(TAPi18n.getLanguage())) {
            const lang = TAPi18n.getLanguage().substr(0, 2);
            moment.locale(lang);
            try {
                numeral.language(lang);
            } catch (err) {
                console.error(`numeral.js couldn't set number formating: ${err.message}`);
            }
            EthTools.setLocale(lang);
        }
    });
});
