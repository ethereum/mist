/**
Template Controllers

@module Templates
*/

/**
The request account popup window template

@class [template] popupWindows_requestAccount
@constructor
*/


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
   'click .ok': function(){
        ipc.send('uiAction_closePopupWindow', 'requestAccount');
   } 
});
