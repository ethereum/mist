/**
Template Controllers

@module Templates
*/

/**
The request account popup window template

@class [template] popupWindows_requestAccount
@constructor
*/

Template['popupWindows_requestAccount'].onRendered(function(){
    this.$('input[type="password"]').focus();
});

Template['popupWindows_requestAccount'].helpers({
    /**
    Returns the the password state

    @method passwordRepeat
    */
    'passwordRepeat': function(){
        return (TemplateVar.get('password-repeat')||false);
    }
});

Template['popupWindows_requestAccount'].events({
   'click .cancel': function(){
        ipc.send('uiAction_closePopupWindow');
   },
   'submit form': function(e, template){
        e.preventDefault();
        var pwOld = template.find('input[type="password"]').value;
        var pw =  template.find('.password-repeat').value;
        
        // TemplateVar.set('password-repeat', !TemplateVar.get('password-repeat'));


        // ask for password repeat
        if(!pw) {
            TemplateVar.set('password-repeat', true);
            // template.find('input[type="password"]').value = '';
            template.$('.password-repeat').focus();
            return;

        // check passwords
        } else if(pw === pwOld) {
            TemplateVar.set('creating', true);
            web3.personal.newAccount(pw, function(e, res){
                if(!e)
                    ipc.send('uiAction_sendToOwner', null, res);
                else
                    ipc.send('uiAction_sendToOwner', e);

                TemplateVar.set(template, 'creating', false);
                ipc.send('uiAction_closePopupWindow');
            });
        
        } else {
            template.find('.password').value = '';
            template.find('.password-repeat').value = '';
            template.$('.password').focus();
            TemplateVar.set('password-repeat', false);

            GlobalNotification.warning({
                content: TAPi18n.__('mist.popupWindows.requestAccount.errors.passwordMismatch'),
                duration: 3
            });
        }

        TemplateVar.set('password', null);
        pwOld = pw = null;
   } 
});
