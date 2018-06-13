/**
Template Controllers

@module Templates
*/

/**
The browserBar template

@class [template] layout_browserBar
@constructor
*/

Template['layout_browserBar'].onRendered(function() {
  var template = this;
});

Template['layout_browserBar'].helpers({
  /**
    Break the URL in protocol, domain and folders

    @method (breadcrumb)
    */
  breadcrumb: function() {
    if (!this || !this.url) {
      return;
    }

    if (this._id === 'wallet') {
      return '';
    }

    try {
      return Helpers.generateBreadcrumb(new URL(this.url));
    } catch (e) {
      return;
    }
  },

  /**
    Returns the current dapp

    @method (dapp)
    */
  dapp: function() {
    return Tabs.findOne(LocalStore.get('selectedTab'));
  },
  /**
    Returns dapps current accounts

    @method (dappAccounts)
    */
  dappAccounts: function() {
    if (this.permissions) {
      return EthAccounts.find({
        address: { $in: this.permissions.accounts || [] }
      });
    }
  },
  /**
    Show the add button, when on a dapp and in doogle

    @method (isBrowser)
    */
  isBrowser: function() {
    return LocalStore.get('selectedTab') === 'browser';
  },
  /**
    Current selected view

    @method (currentWebView)
    */
  currentWebView: function() {
    return '.webview webview[data-id="' + LocalStore.get('selectedTab') + '"]';
  }
});

Template['layout_browserBar'].events({
  /*
    Go back in the dapps browser history

    @event click button.back
    */
  'click button.back': function() {
    var webview = Helpers.getWebview(LocalStore.get('selectedTab'));

    if (webview && webview.canGoBack()) {
      webview.goBack();
    }
  },
  /*
    Reload the current webview

    @event click button.reload
    */
  'click button.reload': function() {
    var webview = Helpers.getWebview(LocalStore.get('selectedTab'));
    if (webview) {
      webview.reload();
    }
  },
  /*
    Remove the current selected tab

    // TODO show popup before to confirm

    @event click button.remove-tab
    */
  'click button.remove-tab': function() {
    var tabId = LocalStore.get('selectedTab');

    Tabs.remove(tabId);
    LocalStore.set('selectedTab', 'browser');
  },
  /**
    Show connect account popup

    @event click .app-bar > button.accounts'
    */
  'click .app-bar > button.accounts': function(e, template) {
    LocalStore.set('chosenTab', LocalStore.get('selectedTab')); // needed by connectAccount
    mist.requestAccount(function(e, addresses) {
      var tabId = LocalStore.get('selectedTab');

      dbSync.syncDataFromBackend(LastVisitedPages);
      dbSync.syncDataFromBackend(Tabs).then(function() {
        Tabs.update(tabId, {
          $set: {
            'permissions.accounts': addresses
          }
        });
      });
    });
  },
  /*
    Hide the app bar on input blur

    @event blur
    */
  'blur .app-bar > form.url .url-input': function(e, template) {
    template.$('.app-bar').removeClass('show-bar');
  },
  /*
    Stop hiding the app bar

    @event mouseenter .app-bar
    */
  'mouseenter .app-bar': function(e, template) {
    clearTimeout(TemplateVar.get('timeoutId'));
  },
  /*
    Send the domain

    @event submit
    */
  submit: function(e, template) {
    var url = Helpers.formatUrl(template.$('.url-input')[0].value);

    // remove focus from url input
    template.$('.url-input').blur();

    // look in tabs
    var url = Helpers.sanitizeUrl(url);
    var tabId = Helpers.getTabIdByUrl(url);

    console.log('Submitted new URL: ' + url);

    // update current tab url
    Tabs.update(tabId, {
      $set: {
        url: url,
        redirect: url
      }
    });
    LocalStore.set('selectedTab', tabId);
  }
});
