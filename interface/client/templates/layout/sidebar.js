/**
Template Controllers

@module Templates
*/

/**
The sidebar template

@class [template] layout_sidebar
@constructor
*/

Template['layout_sidebar'].onRendered(function() {
  var template = this,
    $ul = template.$('nav > ul');

  $ul.sortable({
    containment: 'aside.sidebar',
    axis: 'y',
    items: '> li:not(.browser)',
    handle: 'button.main',
    cancel: '.browser,.wallet',
    cursor: 'move',
    delay: 150,
    revert: 200,
    start: () => {
      $ul.sortable('refreshPositions');
    },
    stop: (event, ui) => {
      // cancel if trying to drop above wallet or browser tabs
      const index = $(ui.item).index();
      if (index < 2) {
        $ul.sortable('cancel');
      }
    },
    update: () => {
      // iterate over the `li`s and reposition the items
      $ul.find('> li').each(index => {
        const id = $(this).data('tab-id');
        const position = index + 1;
        if (id) {
          Tabs.update(id, { $set: { position } });
        }
      });
    }
  });
});

Template['layout_sidebar'].helpers({
  /**
    Return the tabs

    @method (tabs)
    */
  tabs: function() {
    return Tabs.find({}, { sort: { position: 1 } }).fetch();
  },
  /**
    Return the correct name

    @method (name)
    */
  name: function() {
    return this._id === 'browser'
      ? TAPi18n.__('mist.sidebar.buttons.browser')
      : this.name;
  },
  /**
    Return the correct dapp icon

    @method (icon)
    */
  icon: function() {
    return this._id === 'browser' ? 'icons/browse-icon@2x.png' : this.icon;
  },
  /**
    Return the tabs sub menu as array

    @method (subMenu)
    */
  subMenu: function() {
    var template = Template.instance();

    if (this._id === 'browser') {
      return LastVisitedPages.find({}, { sort: { timestamp: -1 }, limit: 25 });
    } else if (this.menu) {
      var menu = _.toArray(this.menu);

      // sort by position
      menu.sort(function(a, b) {
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
  dappAccounts: function(limit) {
    if (this.permissions) {
      if (limit) {
        return EthAccounts.find(
          { address: { $in: this.permissions.accounts || [] } },
          { limit: limit }
        );
      }
      return EthAccounts.find({
        address: { $in: this.permissions.accounts || [] }
      });
    }
  },
  /**
    Determines if the current tab is visible

    @method (isSelected)
    */
  isSelected: function() {
    return LocalStore.get('selectedTab') === (this._id || 'browser')
      ? 'selected'
      : '';
  },
  /**
    It defines which tabs will have a remove button on the interface

    @method (tabShouldBeRemovable)
    */
  tabShouldBeRemovable: function() {
    return !_.contains(['browser', 'wallet'], this._id);
  }
});

Template['layout_sidebar'].events({
  /**
    Select the current visible tab

    @event click button.main
    */
  'click nav button.main': function(e, template) {
    LocalStore.set('selectedTab', this._id || 'browser');
  },
  /**
    Call the submenu dapp callback

    @event click ul.sub-menu button
    */
  'click nav ul.sub-menu button': function(e, template) {
    var tabId = $(e.currentTarget)
      .parent()
      .parents('li')
      .data('tab-id');
    var webview = $('webview[data-id="' + tabId + '"]')[0];

    // browser
    if (tabId === 'browser') {
      webviewLoadStart.call(webview, tabId, {
        newURL: this.url,
        type: 'side-bar-click',
        preventDefault: function() {}
      });

      // dapp tab
    } else if (webview) {
      webview.send('mistAPI_callMenuFunction', this.id);
      LocalStore.set('selectedTab', tabId);
    }
  },
  /**
    Remove the current selected tab

    // TODO show popup before to confirm

    @event click button.remove-tab
    */
  'click button.remove-tab': function() {
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
    var initialTabCount = Tabs.find().fetch().length;
    LocalStore.set('selectedTab', this._id);
    var initialTabId = this._id;

    mist.requestAccount(function(ev, addresses) {
      dbSync.syncDataFromBackend(LastVisitedPages);
      dbSync.syncDataFromBackend(Tabs).then(function() {
        var tabCount = Tabs.find().fetch().length;
        var tabId;
        if (tabCount > initialTabCount) {
          // browse tab was pinned
          tabId = Tabs.findOne({}, { sort: { position: -1 }, limit: 1 });
        } else {
          tabId = initialTabId;
        }
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
    $submenu.css(
      'max-height',
      windowHeight - tabTopOffset - submenuHeaderHeight - 30 + 'px'
    );
  }
});
