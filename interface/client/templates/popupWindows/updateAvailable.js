/**
Template Controllers

@module Templates
*/

/**
The updateAvailable template

@class [template] popupWindows_updateAvailable
@constructor
*/
Template['popupWindows_updateAvailable'].onCreated(function(){
    var template = this;

    /*
    When app update data is received display it.
     */
    ipc.on('uiAction_appUpdateInfo', function(e, update) {
        TemplateVar.set(template, 'update.version', update.version);
        TemplateVar.set(template, 'update.name', update.name);
        TemplateVar.set(template, 'update.url', update.url);
    });
});



Template['popupWindows_updateAvailable'].helpers({
    /**
    Returns the icon path

    @method iconPath
    */
    'iconPath': function(){
        return 'file://'+ window.mist.dirname +'/icons/'+ window.mist.mode +'/icon2x.png';
    },
    /**
    Returns the application name

    @method name
    */
    'name': function(){
        return (window.mist.mode === 'mist') ? 'Mist' : 'Ethereum Wallet';
    },
});