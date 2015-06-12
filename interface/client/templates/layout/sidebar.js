/**
Template Controllers

@module Templates
*/

/**
The sidebar template

@class [template] layout_sidebar
@constructor
*/

Template['layout_sidebar'].helpers({
    /**
    Return the tabs

    @method (tabs)
    */
    'tabs': function() {
        return Tabs.find();
    },
    /**
    Return the doogle history

    @method (history)
    */
    'history': function() {
        return DoogleLastVisitedPages.find({},{sort: {timestamp: -1}, limit: 10});
    },
    /**
    Determines if the current tab is visible

    @method (isVisible)
    */
    'isVisible': function(){
        return (LocalStore.get('selectedTab') === (this._id || 'doogle')) ? 'selected' : '';
    }
});


Template['layout_sidebar'].events({
    /**
    Select the current visible tab

    @event click nav button
    */
    'click nav button': function(e){
        var $button = $(e.currentTarget);
        if($button.hasClass('history')) {

            LocalStore.set('selectedTab', 'browse');
            Session.set('doogleQuery', this.url);

        } else {
            LocalStore.set('selectedTab', this._id || 'browse');
        }
    }
});


