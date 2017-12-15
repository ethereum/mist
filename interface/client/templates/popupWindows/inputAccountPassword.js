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
        var data = Session.get('masterPasswordWrong');

        if (data ) {
            TemplateVar.set('unlocking', false);
            Tracker.afterFlush(function () {
                template.$('input.password').focus();
            });

            GlobalNotification.warning({
                content: TAPi18n.__('mist.popupWindows.unlockMasterPassword.errors.wrongPassword'),
                duration: 3
            });

            Session.set('masterPasswordWrong', false);
        }

        var startScan = Session.get('startScan');
        if(startScan)
        {
            alert("OTA scan generated. Will take few moments to show up in the wallet.");

            ipc.send('backendAction_closePopupWindow');

            Session.set('startScan', false);
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
        var data = Session.get('data');
        const action = data.action;
        console.log("popupWindows_inputAccountPassword data",data);
        TemplateVar.set('unlocking', true);
        setTimeout((e)=>{
            if(action === 'refundCoin') {
                var rfOta = data.para;
                ipc.send('wan_refundCoin', rfOta, pw);
            }else {
                var scAddress = data.scAddress;
                ipc.send('wan_startScan', scAddress, pw, e);
            }

            template.find('input.password').value = '';
            pw = null;
        }, 1000);
    }
});
