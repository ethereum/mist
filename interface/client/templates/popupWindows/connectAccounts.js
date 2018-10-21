var pinToSidebar = function() {
  var selectedTab = TemplateVar.get('tab');

  if (selectedTab) {
    var existingUserTab = Helpers.getTabIdByUrl(selectedTab.url);

    if (existingUserTab === 'browser') {
      var newTabId = Tabs.insert({
        url: selectedTab.url,
        redirect: selectedTab.url,
        name: selectedTab.name,
        menu: {},
        position: Tabs.find().count() + 1
      });
      LocalStore.set('selectedTab', newTabId);
    } else if (existingUserTab) {
      LocalStore.set('selectedTab', existingUserTab);
    }

    if (selectedTab._id === 'browser') {
      var sameLastPage;

      // move the current browser tab to the last visited page
      var lastPageItems = LastVisitedPages.find(
        {},
        { limit: 2, sort: { timestamp: -1 } }
      ).fetch();
      var lastPage = lastPageItems.pop();
      var lastPageURL = lastPage ? lastPage.url : 'about:blank';
      Tabs.update('browser', {
        url: lastPageURL,
        redirect: lastPageURL
      });

      // remove last page from last pages
      if (
        (sameLastPage = LastVisitedPages.findOne({
          url: selectedTab.url
        }))
      ) {
        LastVisitedPages.remove(sameLastPage._id);
      }
    }
  }
};

Template['popupWindows_connectAccounts'].onCreated(function() {
  this.autorun(function() {
    TemplateVar.set('tab', Tabs.findOne(LocalStore.get('selectedTab')));

    const tab = TemplateVar.get('tab');

    var accounts =
      tab && tab.permissions && tab.permissions.accounts
        ? tab.permissions.accounts
        : [];

    // Only use available accounts (in case of network switch or account removal)
    const availableAccounts = _.pluck(EthAccounts.find().fetch(), 'address');
    accounts = _.intersection(accounts, availableAccounts);

    TemplateVar.set('accounts', accounts);
  });
});

Template['popupWindows_connectAccounts'].helpers({
  /**
    Returns the current dapp

    @method (dapp)
    */
  dapp: function() {
    return TemplateVar.get('tab');
  },
  isBrowserTab: function() {
    const selectedTab = TemplateVar.get('tab');
    return selectedTab && selectedTab._id == 'browser';
  },
  /**
    Returns a cleaner version of URL

    @method (dappFriendlyURL)
    */
  dappFriendlyURL: function() {
    var currentTab = TemplateVar.get('tab');
    if (currentTab && currentTab.url) {
      return currentTab.url
        .replace(/^https?:\/\/(www\.)?/, '')
        .replace(/\/$/, '');
    }
  },
  /**
    Return the number of accounts this tab has permission for.

    @method accountNumber
    @return {Number}
    */
  accountNumber: function() {
    var accounts = _.pluck(EthAccounts.find().fetch(), 'address');

    return _.intersection(accounts, TemplateVar.get('accounts')).length;
  },
  /**
    Return an array with the selected accounts.

    @method selectedAccounts
    @return {Array}
    */
  selectedAccounts: function() {
    var accounts = _.pluck(EthAccounts.find().fetch(), 'address');
    return _.intersection(accounts, TemplateVar.get('accounts'));
  },
  /**
    Return "selected" if the current account is allowed in that dapp.

    @method selected
    @return {String} "selected"
    */
  selected: function() {
    return _.contains(TemplateVar.get('accounts'), this.address)
      ? 'selected'
      : '';
  }
});

Template['popupWindows_connectAccounts'].events({
  /**
    Toggles dapp account list selection.

    @event click .dapp-account-list button
    */
  'click .dapp-account-list button': function(e, template) {
    e.preventDefault();
    var accounts = TemplateVar.get('accounts');

    if (!_.contains(accounts, this.address)) {
      accounts.push(this.address);
    } else {
      accounts = _.without(accounts, this.address);
    }

    TemplateVar.set(template, 'accounts', accounts);
  },
  /**
    Closes the popup

    @event click .cancel
    */
  'click .cancel': function() {
    ipc.send('backendAction_closePopupWindow');
  },
  /**
    - Confirm or cancel the accounts available for this dapp and send the accountsChanged event.

    @event click button.confirm, click button.cancel
    */
  'click .ok, click .stay-anonymous': function(event) {
    event.preventDefault();

    var accounts = TemplateVar.get('accounts');

    if ($('#pin-to-sidebar')[0] && $('#pin-to-sidebar')[0].checked) {
      pinToSidebar();
    }

    accounts = _.unique(_.flatten(accounts));

    ipc.send('backendAction_windowMessageToOwner', null, accounts);

    setTimeout(function() {
      ipc.send('backendAction_closePopupWindow');
    }, 600);

    const selectedTab = TemplateVar.get('tab');
    ipc.send('mistAPI_emit_accountsChanged', selectedTab.webviewId, accounts);
  },
  /**
    Create account

    @event click button.create-account
    */
  'click button.create-account': function() {
    ipc.send('mistAPI_createAccount');
  }
});
