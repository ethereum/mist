/**
Template Controllers

@module Templates
*/

/**
The onboardingScreen template

@class [template] popupWindows_onboardingScreen
@constructor
*/


/**
Update the peercount

@method getPeerCount
*/
var getPeerCount = function (template) {
    web3.net.getPeerCount(function (e, res) {
        if (!e) {
            TemplateVar.set(template, 'peerCount', res);
        }
    });
};


Template['popupWindows_onboardingScreen'].onCreated(function () {
    var template = this;
    var oldData;
    TemplateVar.set('readyToLaunch', false);

    // check for block status
    this.syncFilter = web3.eth.isSyncing(function (error, syncing) {
        if (!error) {

            if (syncing === true) {
                web3.reset(true);
            } else if (_.isObject(syncing)) {
                // loads syncing data and adds it to old by using 'extend'
                oldData = TemplateVar.get(template, 'syncing');

                TemplateVar.set(template, 'syncing', _.extend(oldData || {}, syncing || {}));

            } else {
                TemplateVar.set(template, 'syncing', false);
            }
        }
    });


    TemplateVar.set('newAccount', false);
    web3.eth.getAccounts((err, acc) => {
        console.log('newAccount', err, acc);
        if (acc.length > 0) {
            TemplateVar.set(template, 'newAccount', acc[0]);
        }
    });


    // CHECK PEER COUNT
    this.peerCountIntervalId = null;

    TemplateVar.set('peerCount', 0);
    getPeerCount(template);

    Meteor.clearInterval(this.peerCountIntervalId);
    this.peerCountIntervalId = setInterval(function () {
        getPeerCount(template);
    }, 1000);


    TemplateVar.set('currentActive', 'start');

    // store the last class
    this.autorun(function () {
        TemplateVar.set('lastActive', TemplateVar.get('currentActive'));
    });
});


Template['popupWindows_onboardingScreen'].helpers({
    newAccountLowerCase() {
        var account = TemplateVar.get('newAccount');
        return (account) ? account.toLowerCase() : '';
    },
    /**
    Updates the Sync Data

    @method syncStatus
    */
    syncStatus() {

        // This functions loops trhough numbers while waiting for the node to respond
        var template = Template.instance();

        Meteor.clearInterval(template._intervalId);

        // Create an interval to quickly iterate trough the numbers
        template._intervalId = Meteor.setInterval(function () {
            // load the sync information
            var syncing = TemplateVar.get(template, 'syncing');

            if (syncing) {
                // If it's syncing, then it's not ready
                TemplateVar.set(template, 'readyToLaunch', false);

                // Calculates a block t display that is always getting a few % closer to target
                syncing._displayBlock = (syncing._displayBlock + 2 * (syncing.currentBlock - syncing._displayBlock) / 100) || Number(syncing.startingBlock);

                syncing._displayStatesDownload = Number(syncing._displayStatesDownload + (syncing.pulledStates / (1 + syncing.knownStates) - syncing._displayStatesDownload) / 100) || Number(syncing.pulledStates) / Number(syncing.knownStates + 1);

                // Calculates progress
                syncing.progress = 100 * (syncing._displayBlock - syncing.startingBlock) / (1 + Number(syncing.highestBlock) - syncing.startingBlock);

                // Makes fancy strings
                syncing.blockDiff = numeral(syncing.highestBlock - syncing.currentBlock).format('0,0');
                syncing.highestBlockString = numeral(syncing.highestBlock).format('0,0');
                syncing.displayBlock = numeral(Math.round(syncing._displayBlock)).format('0,0');
                syncing.statesPercent = numeral(Math.round(syncing._displayStatesDownload * 10000) / 100).format('0.00');

                // Saves the data back to the object
                TemplateVar.set(template, 'syncing', syncing);


                // If it's close enough, show the synced button

                if (Number(syncing.highestBlock) - syncing.currentBlock < 100) {
                    TemplateVar.set(template, 'readyToLaunch', true);
                }

                // Only show states if they are changing
                if (Math.round(1000 * Number(syncing._displayStatesDownload)) !== Math.round(1000 * Number(syncing.pulledStates / (syncing.knownStates + 1)))) {
                    TemplateVar.set(template, 'syncStatusMessageLive', TAPi18n.__('mist.popupWindows.onboarding.syncMessageWithStates', syncing));
                } else if (syncing.displayBlock === '0') {
                    TemplateVar.set(template, 'syncStatusMessageLive', '');
                } else {
                    TemplateVar.set(template, 'syncStatusMessageLive', TAPi18n.__('mist.popupWindows.onboarding.syncMessage', syncing));
                }
            }

        }, 50);
    },
    /**
    Updates the Sync Message live

    @method syncStatusMessage
    */
    syncStatusMessage() {
        return TemplateVar.get('syncStatusMessageLive');
    }
});

Template['popupWindows_onboardingScreen'].events({
    'click .goto-start': function () {
        TemplateVar.set('currentActive', 'start');
    },
    'click .goto-import-account': function () {
        TemplateVar.set('currentActive', 'import-account');

        // if testnet, make sure to switch to the mainnet
        if (TemplateVar.get('testnet')) {
            ipc.send('onBoarding_changeNet', /* isTestNet: */ false);
            TemplateVar.set('testnet', false);
            TemplateVar.set('syncing', null);
        }
    },
    'click .start-testnet': function (e, template) {
        if (!TemplateVar.get('testnet')) {
            ipc.send('onBoarding_changeNet', /* isMainNet: */ true);
            TemplateVar.set('testnet', true);
            TemplateVar.set('syncing', null);
        }

        if (!TemplateVar.get('newAccount')) {
            TemplateVar.set('currentActive', 'testnet');
            template.$('.onboarding-testnet input.password').focus();
        } else {
            TemplateVar.set('currentActive', 'account');
        }
    },
    'click .goto-password': function (e, template) {
        TemplateVar.set('currentActive', 'password');
        template.$('.onboarding-password input.password').focus();
    },
    'click .goto-account': function () {
        TemplateVar.set('currentActive', 'account');
    },
    'click .goto-tutorial-1': function () {
        TemplateVar.set('currentActive', 'tutorial-1');
        if (!TemplateVar.get('syncing')) {
            TemplateVar.set('readyToLaunch', true);
        }
    },
    'click .goto-tutorial-2': function () {
        TemplateVar.set('currentActive', 'tutorial-2');
        if (!TemplateVar.get('syncing')) {
            TemplateVar.set('readyToLaunch', true);
        }
    },
    'click .goto-tutorial-3': function () {
        TemplateVar.set('currentActive', 'tutorial-3');
        if (!TemplateVar.get('syncing')) {
            TemplateVar.set('readyToLaunch', true);
        }
    },
    /**
    Start the application

    @event click .launch-app
    */
    'click .launch-app': function () {
        ipc.send('onBoarding_launchApp');
    },
    /**
    On drag over prevent redirect

    @event dragover .onboarding-screen, drop .onboarding-screen
    */
    'dragover .onboarding-screen, drop .onboarding-screen': function (e) {
        e.preventDefault();
    }
});


/**
The onboardingScreen account import template

@class [template] popupWindows_onboardingScreen_importAccount
@constructor
*/

Template['popupWindows_onboardingScreen_importAccount'].helpers({
    /**
    Show password

    @method showPassword
    */
    'showPassword': function () {
        return TemplateVar.get('showPassword') ? 'text' : 'password';
    }
});


Template['popupWindows_onboardingScreen_importAccount'].events({
    /**
    On drag enter, change class

    @event dragenter .dropable
    */
    'dragenter .dropable': function (e) {
        $(e.currentTarget).addClass('active');
    },
    /**
    On drag leave, change class

    @event dragleave .dropable
    */
    'dragleave .dropable': function (e) {
        $(e.currentTarget).removeClass('active');
    },
    /**
    When the file is droped, read the path

    @event drop .dropable
    */
    'drop .dropable': function (e, template) {
        e.preventDefault();

        if (e.originalEvent.dataTransfer) {
            files = e.originalEvent.dataTransfer.files;
        }

        if (files.length) {
            ipc.send('backendAction_checkWalletFile', files[0].path);

            ipc.on('uiAction_checkedWalletFile', function (ev, error, type) {
                switch (type) {
                case 'presale':
                    console.log(`Imported ${type} account`);
                    TemplateVar.set(template, 'filePath', files[0].path);
                    Tracker.afterFlush(function () {
                        template.$('.password').focus();
                    });
                    break;
                case 'web3':
                    console.log(`Imported ${type} account`);
                    TemplateVar.set(template, 'filePath', files[0].path);
                    TemplateVar.set(template, 'importing', true);
                    setTimeout(function () {
                        ipc.send('backendAction_closePopupWindow');
                    }, 750);
                    break;
                default:
                    GlobalNotification.warning({
                        content: TAPi18n.__('mist.popupWindows.onboarding.errors.unknownFile'),
                        duration: 4
                    });
                }
            });
        }

        $(e.currentTarget).removeClass('active');
    },
    /**
    On drag over prevent redirect

    @event dragover .dropable
    */
    'dragover .dropable': function (e) {
        e.preventDefault();
    },
    /**
    On show password

    @event click .show-password
    */
    'click .show-password': function (e) {
        TemplateVar.set('showPassword', e.currentTarget.checked);
    },
    /**
    Checks the password match sends the file path and password to the mist backend to import

    @event submit form
    */
    'submit form': function (e, template) {
        var pw = template.find('input.password').value;


        ipc.send('backendAction_importWalletFile', TemplateVar.get('filePath'), pw);

        TemplateVar.set('importing', true);
        ipc.on('uiAction_importedWalletFile', function (ev, error, address) {
            TemplateVar.set(template, 'importing', false);
            TemplateVar.set(template, 'filePath', false);

            if (address) {
                ipc.removeAllListeners('uiAction_importedWalletFile');
                console.log('Imported account: ', address);

                // move to add account screen, when in the onboarding window
                if ($('.onboarding-start')[0]) {
                    TemplateVar.setTo('.onboarding-account', 'newAccount', web3.toChecksumAddress(address));
                    TemplateVar.setTo('.onboarding-screen', 'currentActive', 'account');

                // otherwise simply close the window
                } else {
                    ipc.send('backendAction_closePopupWindow');
                }


            } else {
                console.log('Import failed', error);

                if (error === 'Decryption Failed') {
                    GlobalNotification.warning({
                        content: TAPi18n.__('mist.popupWindows.onboarding.errors.wrongPassword'),
                        duration: 4
                    });
                } else {
                    GlobalNotification.warning({
                        content: TAPi18n.__('mist.popupWindows.onboarding.errors.importFailed', { error
                        }),
                        duration: 4
                    });
                }
            }
        });

        // clear form
        template.find('input.password').value = '';
        pw = null;
    }
});


/**
The onboardingScreen password template

@class [template] popupWindows_onboardingScreen_password
@constructor
*/

Template['popupWindows_onboardingScreen_password'].helpers({
    /**
    Show password

    @method showPassword
    */
    'passwordInputType': function () {
        return TemplateVar.get('passwordInputType') ? 'text' : 'password';
    }
});


Template['popupWindows_onboardingScreen_password'].events({
    /**
    Clear the form

    @event click button[type="button"]
    */
    'click button[type="button"]': function (e, template) {
        template.find('input.password').value = '';
        template.find('input.password-repeat').value = '';
    },
    /**
    On show password

    @event click .show-password
    */
    'click .show-password': function (e) {
        TemplateVar.set('passwordInputType', e.currentTarget.checked);
    },
    /**
    Password checks

    @event click button[type="button"]
    */
    'input input, change input': function (e, template) {
        var pw = template.find('input.password').value;
        var pwRepeat = template.find('input.password-repeat').value;

        TemplateVar.set(template, 'passwordsNotEmpty', pw !== '' || pwRepeat !== '');
        TemplateVar.set(template, 'passwordsMismatch', pwRepeat && pw !== pwRepeat);

    },
    /**
    Checks the password match and creates a new account

    @event submit form
    */
    'submit form': function (e, template) {
        var pw = template.find('input.password').value;
        var pwRepeat = template.find('input.password-repeat').value;

        if (pw !== pwRepeat) {
            GlobalNotification.warning({
                content: TAPi18n.__('mist.popupWindows.requestAccount.errors.passwordMismatch'),
                duration: 3
            });
        } else if (pw && pw.length < 8) {
            GlobalNotification.warning({
                content: TAPi18n.__('mist.popupWindows.requestAccount.errors.passwordTooShort'),
                duration: 3
            });
        } else if (pw && pw.length >= 8) {
            TemplateVar.set('creatingPassword', true);
            web3.personal.newAccount(pw, function (e, res) {
                TemplateVar.set(template, 'creatingPassword', false);

                // notifiy about backing up!
                alert(TAPi18n.__('mist.popupWindows.requestAccount.backupHint'));

                if (!e) {
                    TemplateVar.setTo('.onboarding-account', 'newAccount', web3.toChecksumAddress(res));
                    TemplateVar.setTo('.onboarding-screen', 'currentActive', 'account');

                    // clear form
                    pw = null;
                    pwRepeat = null;

                } else {
                    GlobalNotification.warning({
                        content: TAPi18n.__('mist.popupWindows.onboarding.errors.nodeNotStartedYet'),
                        duration: 4
                    });
                }
            });
        }
    }
});
