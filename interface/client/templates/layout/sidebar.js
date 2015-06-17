/**
Template Controllers

@module Templates
*/

/**
The sidebar template

@class [template] layout_sidebar
@constructor
*/

Template['layout_sidebar'].onRendered(function(){
    var template = this,
        $ul = template.$('nav > ul');

    $ul.sortable({
        containment: 'aside.sidebar',
        axis: 'y',
        // tolerance: 'pointer',
        items: '> li:not(.browser)',
        handle: 'button.main',
        cancel: '',
        cursor: 'move',
        delay: 150,
        revert: 200,
        start: function(e){
            $ul.sortable('refreshPositions');
        },
        update: function(e){
            // iterate over the lis and reposition the items
            $ul.find('> li').each(function(index, test){
                var id = $(this).data('tab-id');
                if(id)
                    Tabs.update(id, {$set: {position: index}});
            });
        }
    });
});


Template['layout_sidebar'].helpers({
    /**
    Return the tabs

    @method (tabs)
    */
    'tabs': function() {

        // UPADATE MAIN APPLICATION MENU
        Tracker.afterFlush(function(){
            updateApplicationMenuDevTools($('webview'));
        });


        return Tabs.find({}, {sort: {position: 1}}).fetch();
    },
    /**
    Return the tabs sub menu as array

    @method (subMenu)
    */
    'subMenu': function(){
        var template = Template.instance();

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

    @event click button.main
    */
    'click nav button.main': function(e, template){
        LocalStore.set('selectedTab', this._id || 'browser');
    },
    /**
    Select the current visible tab

    @event click nav ul.history button
    */
    'click nav ul.history button': function(e, template){
        LocalStore.set('selectedTab', 'browser');
        Session.set('browserQuery', this.url);
    },
    /**
    Call the submenu dapp callback

    @event click ul.sub-menu button
    */
    'click nav ul.sub-menu button': function(e, template){
        var tabId = $(e.currentTarget).parent().parents('li').data('tab-id');
        var webview = $('webview[data-id="'+ tabId +'"]')[0];

        if(webview) {
            webview.send('callFunction', this.id);
            LocalStore.set('selectedTab', tabId);
        }
    },
    /**
    Slide out

    @event button.slide-out
    */
    'click button.slide-out': function(e, template){
        Tabs.update(this._id, {$set: {menuVisible: !this.menuVisible}});
    }
});


