/**
Template Controllers

@module Templates
*/

/**
The sidebar template

@class [template] layout_sidebar
@constructor
*/

Template['layout_sidebar'].onRendered(function () {
    var template = this,
        $ul = template.$('nav > ul');

    $ul.sortable({
        containment: 'aside.sidebar',
        axis: 'y',
        // tolerance: 'pointer',
        items: '> li:not(.browser)',
        handle: 'button.main',
        cancel: '.browser',
        cursor: 'move',
        delay: 150,
        revert: 200,
        start: function (e) {
            $ul.sortable('refreshPositions');
        },
        update: function (e) {
            // iterate over the lis and reposition the items
            $ul.find('> li').each(function (index, test) {
                var id = $(this).data('tab-id');
                if (id) {
                    Tabs.update(id, { $set: { position: index + 1 } });
                }
            });
        }
    });

    template.$('[data-tab-id]').on('mouseover', function(){
    });
});


Template['layout_sidebar'].helpers({
    /**
    Return the tabs

    @method (tabs)
    */
    'tabs': function () {
        return Tabs.find({}, { sort: { position: 1 } }).fetch();
    },
    /**
    Return the correct name

    @method (name)
    */
    'name': function () {
        return (this._id === 'browser') ? TAPi18n.__('mist.sidebar.buttons.browser') : this.name;
    },
    /**
    Return the correct dapp icon

    @method (icon)
    */
    'icon': function () {
        return (this._id === 'browser') ? 'icons/browse-icon@2x.png' : this.icon;
    },
    /**
    Return the tabs sub menu as array

    @method (subMenu)
    */
    'subMenu': function () {
        var template = Template.instance();

        if (this._id === 'browser') {
            return LastVisitedPages.find({}, { sort: { timestamp: -1 }, limit: 25 });

        } else if (this.menu) {
            var menu = _.toArray(this.menu);

            // sort by position
            menu.sort(function (a, b) {
                if (a.position < b.position) {
                    return -1;
                }
                if (a.position > b.position) {
                    return 1;
                }
                return 0;
            });

            return menu;
        }
    },
    /**
    Returns connected accounts for dapp

    @method (dappAccounts)
    */
    'dappAccounts': function(limit) {
        if(this.permissions){
            if (limit)
                return EthAccounts.find({address: {$in: this.permissions.accounts || []}}, {limit: limit});
            else
                return EthAccounts.find({address: {$in: this.permissions.accounts || []}});
        }
    },
    /**
    Determines if the current tab is visible

    @method (isSelected)
    */
    'isSelected': function () {
        var selected = (LocalStore.get('selectedTab') === (this._id || 'browser')) ? 'selected' : '';

        if (this.menuVisible) {
            selected += ' slided-out';
        }

        return selected;
    },
    /**
    Determines if the current tab is visible

    @method (fullTabs)
    */
    'fullTabs': function () {
        return (LocalStore.get('fullTabs')) ? 'full-tabs' : '';
    }
});


Template['layout_sidebar'].events({
    /**
    Select the current visible tab

    @event click button.main
    */
    'click nav button.main': function (e, template) {
        LocalStore.set('selectedTab', this._id || 'browser');
    },
    /**
    Call the submenu dapp callback

    @event click ul.sub-menu button
    */
    'click nav ul.sub-menu button': function (e, template) {
        var tabId = $(e.currentTarget).parent().parents('li').data('tab-id');
        var webview = $('webview[data-id="' + tabId + '"]')[0];

        // browser
        if (tabId === 'browser') {
            webviewLoadStart.call(webview, tabId, { newURL: this.url, type: 'side-bar-click', preventDefault: function () {} });

        // dapp tab
        } else if (webview) {
            webview.send('mistAPI_callMenuFunction', this.id);
            LocalStore.set('selectedTab', tabId);
        }
    },
    /**
    Slide out

    @event button.slide-out
    */
    'click button.slide-out': function (e, template) {
        var isSelected = (LocalStore.get('selectedTab') === (this._id || 'browser'));

        if (isSelected && LocalStore.get('fullTabs')) {
            LocalStore.set('fullTabs', false);
        } else if (isSelected) {
            LocalStore.set('fullTabs', true);
        } else {
            Tabs.update(this._id, { $set: { menuVisible: !this.menuVisible } });
        }
    },
    /**
    See all

    @event .see-all button
    */
    'click li.see-all > button': function (e, template) {
        var isSelected = (LocalStore.get('selectedTab') === (this._id || 'browser'));

        if (isSelected && LocalStore.get('fullTabs')) {
            LocalStore.set('fullTabs', false);
        } else if (isSelected) {
            LocalStore.set('fullTabs', true);
        }
    },
    /**
    Remove the current selected tab

    // TODO show popup before to confirm

    @event click button.remove-tab
    */
    'click button.remove-tab': function () {
        if (LocalStore.get('selectedTab') === this._id) {
            LocalStore.set('selectedTab', 'browser');
        }

        Tabs.remove(this._id);
    },
    /**
    Show connect account popup

    @event click .accounts button'
    */
    'click .accounts button': function(e, template) {
        tabId = this._id;
        LocalStore.set('chosenTab', this._id);
        mist.requestAccount(function(e, addresses){
            dbSync.syncDataFromBackend(LastVisitedPages);
            dbSync.syncDataFromBackend(Tabs).then(function(){
                Tabs.update(tabId, {
                    $set: {
                        'permissions.accounts': addresses
                    }
                });
            });
        });
    },

    /**
    Shows dapp submenu

    @event mouseenter .sidebar-menu > li
    */
    'mouseenter .sidebar-menu > li': function(e, template) {
        var $this = $(e.currentTarget);
        var tabTopOffset = $this.offset().top;
        var $submenuContainer = $this.find('.submenu-container');
        var $submenu = $this.find('.sub-menu');
        var submenuHeaderHeight = $this.find('header').outerHeight();
        var windowHeight = $(window).outerHeight();

        $submenuContainer.css('top', tabTopOffset + 'px');
        $submenu.css('max-height', (windowHeight - tabTopOffset - submenuHeaderHeight - 30) + 'px');
    },
});
