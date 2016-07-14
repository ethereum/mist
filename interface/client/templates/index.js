/**
Template Controllers

@module Templates
*/

/**
The body template

@class [template] body
@constructor
*/

Template.body.helpers({
    /**
    Chooses the view to render at start

    @method renderApp
    */
    'renderApp': function(){
        if(_.isEmpty(location.hash)) {
            $('title').text('Mist');
            return 'layout_main';
        } else {
            var renderWindow = location.hash.match(/#([a-zA-Z]*)_?/);

            console.log('renderWindow', renderWindow, renderWindow.length, 'popupWindows_' + renderWindow[1]);

            if (renderWindow.length>0)
                return 'popupWindows_' + renderWindow[1];
            else 
                return true;
        }
        // if(~location.hash.indexOf('#loadingWindow')) {
        //     return 'popupWindows_loadingWindow';
        // }
        // if(~location.hash.indexOf('#updateAvailable')) {
        //     return 'popupWindows_updateAvailable';
        // }
        // if(~location.hash.indexOf('#splashScreen')) {
        //     return 'popupWindows_splashScreen';
        // }
        // if(~location.hash.indexOf('#onboardingScreen')) {
        //     return 'popupWindows_onboardingScreen';
        // }
        // if(~location.hash.indexOf('#importAccount')) {
        //     return 'popupWindows_importAccount';
        // }
        // if(~location.hash.indexOf('#about')) {
        //     return 'popupWindows_about';
        // }
        // if(location.hash === '#requestAccount') {
        //     // $('title').text(TAPi18n.__('mist.popupWindows.requestAccount.title')
        //     return 'popupWindows_requestAccount';
        // }
        // if(location.hash === '#unlockMasterPassword') {
        //     // $('title').text(TAPi18n.__('mist.popupWindows.requestAccount.title')
        //     return 'popupWindows_unlockMasterPassword';
        // }
        // if(location.hash === '#sendTransactionConfirmation') {
        //     // $('title').text(TAPi18n.__('mist.popupWindows.requestAccount.title')
        //     return 'popupWindows_sendTransactionConfirmation';
        // }        
        // if(location.hash === '#forkChoice') {
        //     // $('title').text(TAPi18n.__('mist.popupWindows.requestAccount.title')
        //     return 'popupWindows_forkChoice';
        // }
    }
});

/*
Template.body.events({
    /**
    On drag over prevent redirect

    @event dragover body > *, drop body > *
    *
   'dragover body > *, drop body > *': function(e){
        e.preventDefault();
    },
});*/