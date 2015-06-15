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
        var template = Template.instance();

        setHeight(template);

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

    @method (isSelected)
    */
    'isSelected': function(){
        var selected = (LocalStore.get('selectedTab') === (this._id || 'browser')) ? 'selected' : '';

        if(this.menuVisible)
            selected += ' slided-out';

        return selected;
    }
});


Template['layout_sidebar'].events({
    /**
    Select the current visible tab

    @event click nav button:not(.slide-out)
    */
    'click nav button:not(.slide-out)': function(e, template){
        var $button = $(e.currentTarget);
        if($button.hasClass('history')) {

            LocalStore.set('selectedTab', 'browser');
            Session.set('browserQuery', this.url);

        // Dapp submenu is clicked
        } else if($button.hasClass('sub-menu')) {
            var tabId = $button.data('tab-id');
            var webview = $('webview[data-id="'+ tabId +'"]')[0];

            if(webview) {
                webview.send('callFunction', this.id);
                LocalStore.set('selectedTab', tabId);
            }

        } else {

            LocalStore.set('selectedTab', this._id || 'browser');

            setHeight(template);
        }
    },
    /**
    Slide out

    @event button.slide-out
    */
    'click button.slide-out': function(e, template){
        Tabs.update(this._id, {$set: {menuVisible: !this.menuVisible}});

        setHeight(template);
    }
});


