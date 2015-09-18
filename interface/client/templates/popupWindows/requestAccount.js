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
    Returns the icon path

    @method iconPath
    */
    'iconPath': function(){
        return 'file://'+ dirname +'icons/'+ mode +'/icon2x.png';
    }
});

Template['popupWindows_requestAccount'].events({
   'click .cancel': function(){
        ipc.send('uiAction_closePopupWindow', 'requestAccount');
   },
   'submit form': function(e, template){
        e.preventDefault();
        var pw = template.find('input[type="password"]').value;
        var pwOld = TemplateVar.get('password');
        

        // ask for password repeat
        if(!pwOld) {
            TemplateVar.set('password', template.find('input[type="password"]').value);
            template.find('input[type="password"]').value = '';
            template.$('input[type="password"]').focus();
            return;

        // check passwords
        } else if(pw === pwOld) {
            web3.personal.newAccount(pw, function(e, res){
                if(!e)
                    ipc.send('uiAction_closePopupWindow', 'requestAccount');
                else {
                    console.error(e);
                }
            });
        
        } else {
            template.find('input[type="password"]').value = '';

            GlobalNotification.warning({
                content: TAPi18n.__('mist.popupWindows.requestAccount.errors.passwordMismatch'),
                duration: 3
            });
        }

        TemplateVar.set('password', null);
        pwOld = pw = null;
   } 
});
