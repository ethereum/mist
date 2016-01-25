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
   }

});