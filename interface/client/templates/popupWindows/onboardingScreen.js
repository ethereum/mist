import ethereumjsWallet from 'ethereumjs-wallet';
import hdkey from 'ethereumjs-wallet/hdkey';
import bip39 from 'bip39';

/**
Template Controllers

@module Templates
*/

/**
The onboardingScreen template

@class [template] popupWindows_onboardingScreen
@constructor
*/

Template['popupWindows_onboardingScreen'].onCreated(function () {
    var template = this;

    TemplateVar.set('readyToLaunch', false);
    TemplateVar.set('newAccount', false);

    const accounts = store.getState().accounts.active;
    if (accounts.length > 0) {
        TemplateVar.set(template, 'newAccount', accounts[0]);
    }

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
    }
});

Template['popupWindows_onboardingScreen'].events({
    'click .goto-start': function () {
        TemplateVar.set('currentActive', 'start');
    },
    'click .goto-import-account': function () {
        TemplateVar.set('currentActive', 'import-account');
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
        TemplateVar.set('readyToLaunch', true);
    },
    'click .goto-tutorial-2': function () {
        TemplateVar.set('currentActive', 'tutorial-2');
        TemplateVar.set('readyToLaunch', true);
    },
    'click .goto-tutorial-3': function () {
        TemplateVar.set('currentActive', 'tutorial-3');
        TemplateVar.set('readyToLaunch', true);
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
                    console.log(`Importing ${type} account`);
                    TemplateVar.set(template, 'filePath', files[0].path);
                    Tracker.afterFlush(function () {
                        template.$('.password').focus();
                    });
                    break;
                case 'web3':
                    console.log(`Importing ${type} account`);
                    TemplateVar.set(template, 'filePath', files[0].path);
                    TemplateVar.set(template, 'importing', false);
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
                    TemplateVar.setTo('.onboarding-account', 'newAccount', address);
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
                        content: TAPi18n.__('mist.popupWindows.onboarding.errors.importFailed', { error }),
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

            // Give the UI 300ms to update before creating
            setTimeout(function(password = pw, template = template) {
                const mnemonic = bip39.generateMnemonic();
                const bip32 = hdkey.fromMasterSeed(mnemonic);
                const wallet = bip32.getWallet();
                const walletJSON = wallet.toV3(password);
                const walletFileName = wallet.getV3Filename(Date.now());
                ipc.send('backendAction_saveNewWallet', walletFileName, walletJSON);

                TemplateVar.set(template, 'creatingPassword', false);

                // ipc.send('backendAction_windowMessageToOwner', null, wallet.getAddress());

                TemplateVar.setTo('.onboarding-account', 'newAccount', wallet.getChecksumAddressString());
                TemplateVar.setTo('.onboarding-screen', 'currentActive', 'account');

                // Notifiy about backing up!
                alert(TAPi18n.__('mist.popupWindows.requestAccount.backupHint'));

                // TODO: Design flow to have them write down their `mnemonic`, and then optionally verify it

                // clear form
                pw = null;
                pwRepeat = null;
            }, 300, pw, template);
        }
    }
});
