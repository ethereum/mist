/**
Template Controllers

@module Templates
*/

/**
The request account popup window template

@class [template] popupWindows_unlockMasterPassword
@constructor
*/
Template['popupWindows_changeAccountPassword'].onRendered(function () {
    var template = this;

    template.$('input.oldPassword').focus();
    TemplateVar.set('showPassword', false);
});
Template['popupWindows_changeAccountPassword'].helpers({
    'passwordInputType': function () {
        return TemplateVar.get('showPassword') ? 'text' : 'password';
    }
});


Template['popupWindows_changeAccountPassword'].events({
    'click .cancel': function () {
        ipc.send('backendAction_closePopupWindow');
    },
    'click .show-password': function (e) {
        TemplateVar.set('showPassword', e.currentTarget.checked);
    },
    'submit form': function (e, template) {
        e.preventDefault();
        //cranelv add Account name input 2017-11-14
        var oldpw = template.find('input.oldPassword').value;
        var pw = template.find('input.newPassword').value;
        var pwRepeat = template.find('input.repeatPassword').value;

        // ask for password repeat
        // check passwords

        if ( pw !== pwRepeat) {
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
            var data = Session.get('data');
            var address = data.address;
            web3.personal.updateAccount(address, oldpw, pw, function (e) {
                if(e){
                    alert('Change passwordError :' + e + '! Try again.');
                }
                else
                {
                    ipc.send('backendAction_closePopupWindow');
                    TemplateVar.set('password-repeat', false);
                    template.find('input.oldPassword').value = '';
                    template.find('input.repeatPassword').value = '';
                    template.find('input.newPassword').value = '';
                    pw = pwRepeat = null;
                }

                // notifiy about backing up!
            });
        }

    }
});
