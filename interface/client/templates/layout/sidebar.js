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
    Return the tabs sub menu as array

    @method (subMenu)
    */
    'subMenu': function(){
        if(this.menu) {
            var menu = _.toArray(this.menu);

            // sort by position
            menu.sort(function(a, b){
                if(a.position < b.position) return -1;
                if(a.position > b.position) return 1;
                return 0;
            });

            return menu;
        }
    },
    /**
    Return the doogle history

    @method (history)
    */
    'history': function() {
        return DoogleLastVisitedPages.find({},{sort: {timestamp: -1}, limit: 5});
    },
    /**
    Determines if the current tab is visible

    @method (isVisible)
    */
    'isVisible': function(){
        return (LocalStore.get('selectedTab') === (this._id || 'browser')) ? 'selected' : '';
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

            LocalStore.set('selectedTab', 'browser');
            Session.set('browserQuery', this.url);

        // Dapp submenu is clicked
        } else if($button.hasClass('sub-menu')) {
            var webview = $('webview[data-id="'+ $button.data('tab-id') +'"]')[0];

            if(webview)
                webview.send('callFunction', this.id);

        } else {
            LocalStore.set('selectedTab', this._id || 'browser');
        }
    }
});


