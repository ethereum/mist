/**
Template Controllers

@module Templates
*/


/**
The about template

@class [template] popupWindows_about
@constructor
*/
Template['popupWindows_about'].onCreated(function(){

});


Template['popupWindows_about'].helpers({
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
    /**
    Returns mist api

    @method mist
    */
    'mist': function(){
        return mist;
    }
});