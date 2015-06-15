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
    Return the tabs

    @method (tabs)
    */
    'tabs': function() {
        var tabs = Tabs.find().fetch(); // fetch so that it reloads this function.

        Tracker.afterFlush(function(){
            updateApplicationMenuDevTools($('webview'));
        });

        return tabs;
    }
});