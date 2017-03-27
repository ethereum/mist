/**
Template Controllers

@module Templates
*/

/**
The main section template

@class [template] layout_webviews
@constructor
*/

Template['layout_webviews'].helpers({
    /**
    Return the tabs

    @method (tabs)
    */
    'tabs': function () {
        return Tabs.find({}, { field: { position: 1 } });
    }
});
