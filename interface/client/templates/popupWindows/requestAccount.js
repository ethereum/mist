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
    this.$('input.account').focus();
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
        //cranelv add Account name input 2017-11-14
        var account1 = template.find('input.account').value;
        var pw = template.find('input.password').value;
        var pwRepeat = template.find('input.password-repeat').value;

        // ask for password repeat
        // check passwords
        if(account1 && account1.length< 2){
            GlobalNotification.warning({
                content: TAPi18n.__('mist.popupWindows.requestAccount.errors.passwordTooShort'),
                duration: 3
            });
        }
        else if ( pw !== pwRepeat) {
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
            web3.personal.newAccount(pwRepeat, function (e, res) {
                if (!e) {
                    var insert = {
                        type: 'account',
                        address: res,
                        name: account1,
                    };
                    ipc.send('backendAction_windowMessageToOwner', null, insert);
                } else {
                    ipc.send('backendAction_windowMessageToOwner', e);
                }
                TemplateVar.set(template, 'creating', false);

                // notifiy about backing up!
                alert(TAPi18n.__('mist.popupWindows.requestAccount.backupHint'));

                ipc.send('backendAction_closePopupWindow');
            });

        }

        TemplateVar.set('password-repeat', false);
        template.find('input.account').value = '';
        template.find('input.password-repeat').value = '';
        template.find('input.password').value = '';
        pw = pwRepeat = null;
   }
});
