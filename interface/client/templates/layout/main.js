/**
Template Controllers

@module Templates
*/

/**
The main section template

@class [template] layout_main
@constructor
*/

Template['layout_main'].helpers({
    /**
    Return the tabs

    @method (tabs)
    */
    'tabs': function() {
        return Tabs.find({}, {field: {position: -1}});
    }
});