/**
Template Controllers

@module Templates
*/

/**
The request account popup window template

@class [template] popupWindows_unlockMasterPassword
@constructor
*/

Template['popupWindows_unlockMasterPassword'].onRendered(function () {
    var template = this;

    template.$('input.password').focus();

    template.autorun(function () {
        var data = Session.get('data');

        if (data && data.masterPasswordWrong) {
            TemplateVar.set('unlocking', false);

            Tracker.afterFlush(function () {
                template.$('input.password').focus();
            });

            GlobalNotification.warning({
                content: TAPi18n.__('mist.popupWindows.unlockMasterPassword.errors.wrongPassword'),
                duration: 3
            });

            Session.set('data', false);
        }
    });
});


Template['popupWindows_unlockMasterPassword'].events({
    'click .cancel': function () {
        ipc.send('backendAction_closePopupWindow');
    },
    'submit form': function (e, template) {
        e.preventDefault();
        var pw = template.find('input.password').value;

        TemplateVar.set('unlocking', true);

        ipc.send('backendAction_unlockedMasterPassword', null, pw);

        template.find('input.password').value = '';
        pw = null;
    }
});
