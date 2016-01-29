/**
Template Controllers

@module Templates
*/

/**
The onboardingScreen template

@class [template] popupWindows_onboardingScreen
@constructor
*/

Template['popupWindows_onboardingScreen'].onCreated(function(){
    var template = this;
    TemplateVar.set('readyToLaunch', false);
})

Template['popupWindows_onboardingScreen'].onRendered(function(){
    var template = this;
    TemplateVar.set('currentActive','start');
})

Template['popupWindows_onboardingScreen'].events({
   'click .goto-drop-file': function(){
        TemplateVar.set('lastActive', TemplateVar.get('currentActive'));
        TemplateVar.set('currentActive','drop-file');
   },
   'click .goto-start': function(){
        TemplateVar.set('lastActive', TemplateVar.get('currentActive'));
        TemplateVar.set('currentActive','start');
   },
   'click .goto-password': function(){
        TemplateVar.set('lastActive', TemplateVar.get('currentActive'));
        TemplateVar.set('currentActive','password');
   },
   'click .goto-bitcoin': function(){
        TemplateVar.set('lastActive', TemplateVar.get('currentActive'));
        TemplateVar.set('currentActive','bitcoin');
   },
   'click .goto-tutorial-1': function(){
        TemplateVar.set('lastActive', TemplateVar.get('currentActive'));
        TemplateVar.set('currentActive','tutorial-1');
   },
   'click .goto-tutorial-2': function(){
        TemplateVar.set('lastActive', TemplateVar.get('currentActive'));
        TemplateVar.set('currentActive','tutorial-2');
   },
   'click .goto-tutorial-3': function(){
        TemplateVar.set('lastActive', TemplateVar.get('currentActive'));
        TemplateVar.set('currentActive','tutorial-3');
        TemplateVar.set('readyToLaunch', true);
   },
   /**
    Request to create an account in mist
    
    @event click .create.account
    */
    'click .shapeshift': function(e){

        // var shapeshiftWindow = new BrowserWindow({
        //     width: 600 ,
        //     height: 500,
        //     icon: global.icon,
        //     resizable: false,
        //     'node-integration': false,
        //     'standard-window': false,
        //     'use-content-size': false,
        //     frame: true,
        //     'web-preferences': {
        //         'web-security': false // necessary to make routing work on file:// protocol
        //     }
        // });
        // shapeshiftWindow.loadURL('http://google.com');

    }

});