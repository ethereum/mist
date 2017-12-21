import ethereumjsWallet from 'ethereumjs-wallet';
import hdkey from 'ethereumjs-wallet/hdkey';
import bip39 from 'bip39';

/**
Template Controllers

@module Templates
*/

/**
The request account popup window template

@class [template] popupWindows_requestAccount
@constructor
*/

Template['popupWindows_requestAccount'].onRendered(function () {
    this.$('input.password').focus();
    TemplateVar.set('showPassword', false);
});

Template['popupWindows_requestAccount'].helpers({
    'passwordInputType': function () {
        return TemplateVar.get('showPassword') ? 'text' : 'password';
    }
});

Template['popupWindows_requestAccount'].events({
    'click .cancel': function () {
        ipc.send('backendAction_closePopupWindow');
    },
    'click .show-password': function (e) {
        TemplateVar.set('showPassword', e.currentTarget.checked);
    },
    'submit form': function (e, template) {
        e.preventDefault();
        var pw = template.find('input.password').value;
        var pwRepeat = template.find('input.password-repeat').value;

        // ask for password repeat
        if (!pwRepeat) {
            TemplateVar.set('password-repeat', true);
            template.$('input.password-repeat').focus();

            // stop here so we dont set the password repeat to false
            return;
        }

        // check passwords
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

            TemplateVar.set('creating', true);

            // Give the UI 300ms to update 'Generating...' before creating
            setTimeout(function(pw = pw) {
                const mnemonic = bip39.generateMnemonic();
                const bip32 = hdkey.fromMasterSeed(mnemonic);
                const wallet = bip32.getWallet();
                const walletJSON = wallet.toV3(pw);
                const walletFileName = wallet.getV3Filename(Date.now());
                ipc.send('backendAction_saveNewWallet', walletFileName, walletJSON);

                TemplateVar.set(template, 'creating', false);

                // Notifiy about backing up!
                alert(TAPi18n.__('mist.popupWindows.requestAccount.backupHint'));
                alert(mnemonic);

                ipc.send('backendAction_closePopupWindow');
            }, 300, pw);
        }

        TemplateVar.set('password-repeat', false);
        template.find('input.password-repeat').value = '';
        template.find('input.password').value = '';
        pw = pwRepeat = null;
   }
});
