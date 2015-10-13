/**
Template Controllers

@module Templates
*/

/**
The request account popup window template

@class [template] popupWindows_unlockMasterPassword
@constructor
*/

Template['popupWindows_unlockMasterPassword'].onRendered(function(){
    this.$('input.password').focus();
});


Template['popupWindows_unlockMasterPassword'].events({
   'click .cancel': function(){
        ipc.send('uiAction_closePopupWindow');
   },
   'submit form': function(e, template){
        e.preventDefault();
        var pw = template.find('input.password').value;

        ipc.send('uiAction_unlockedMasterPassword', null, pw);

        template.find('input.password').value = '';
        pw = null;
   } 
});
