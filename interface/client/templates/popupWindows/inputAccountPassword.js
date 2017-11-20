/**
Template Controllers

@module Templates
*/

/**
The request account popup window template

@class [template] popupWindows_unlockMasterPassword
@constructor
*/

Template['popupWindows_inputAccountPassword'].onRendered(function () {
    var template = this;

    template.$('input.password').focus();

    template.autorun(function () {
        var data = Session.get('data');

        if (data && data.masterPasswordWrong) {

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


Template['popupWindows_inputAccountPassword'].events({
    'click .cancel': function () {
        ipc.send('backendAction_closePopupWindow');
    },
    'submit form': function (e, template) {
        e.preventDefault();
        var pw = template.find('input.password').value;
        //var address = template.find('input.password').value;
        var address = "9da26fc2e1d6ad9fdd46138906b0104ae68a65d8";

        ipc.send('backendAction_unlockedMasterPassword', null, pw);
        ipc.send('mistAPI_startScan', address,pw);

        template.find('input.password').value = '';
        pw = null;
        ipc.send('backendAction_closePopupWindow');
    }
});
