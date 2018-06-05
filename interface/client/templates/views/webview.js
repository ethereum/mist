/**
Template Controllers

@module Templates
*/

/**
The tab template

@class [template] views_webview
@constructor
*/

Template['views_webview'].onRendered(function() {
  var template = this,
    tabId = template.data._id,
    webview = template.find('webview');

  ipc.on('uiAction_reloadSelectedTab', function(e) {
    console.log('uiAction_reloadSelectedTab', LocalStore.get('selectedTab'));
    if (LocalStore.get('selectedTab') === this._id) {
      var webview = Helpers.getWebview(LocalStore.get('selectedTab'));
      webview.reload();
    }
  });

  webview.addEventListener('did-start-loading', function(e) {
    TemplateVar.set(template, 'loading', true);
  });
  webview.addEventListener('did-stop-loading', function(e) {
    TemplateVar.set(template, 'loading', false);
  });

  // change url
  webview.addEventListener(
    'did-navigate',
    webviewChangeUrl.bind(webview, tabId)
  );
  webview.addEventListener(
    'did-navigate-in-page',
    webviewChangeUrl.bind(webview, tabId)
  );
  webview.addEventListener(
    'did-get-redirect-request',
    webviewChangeUrl.bind(webview, tabId)
  );
  webview.addEventListener(
    'did-stop-loading',
    webviewChangeUrl.bind(webview, tabId)
  );

  // set page history
  webview.addEventListener('dom-ready', function(e) {
    var titleFull = webview.getTitle(),
      title = titleFull;

    if (titleFull && titleFull.length > 40) {
      title = titleFull.substr(0, 40);
      title += '…';
    }

    // update the title
    Tabs.update(tabId, {
      $set: {
        name: title,
        nameFull: titleFull
        // url: webview.getURL(),
      }
    });

    webviewLoadStop.call(this, tabId, e);
  });

  // show error pages
  webview.addEventListener('did-fail-load', showError.bind(webview, tabId));
  webview.addEventListener('crashed', showError.bind(webview, tabId));

  // Forward SWARM status code errors to showError
  webview.addEventListener('did-get-response-details', function(e) {
    if (e && e.resourceType === 'mainFrame' && /^bzz:\//i.test(e.newURL)) {
      switch (e.httpResponseCode) {
        case 500:
          showError.call(webview, tabId, {
            isMainFrame: true,
            errorCode: 404
          });
          break;
      }
    }
  });

  // navigate page, and redirect to browser tab if necessary
  webview.addEventListener(
    'will-navigate',
    webviewLoadStart.bind(webview, tabId)
  );
  webview.addEventListener(
    'did-get-redirect-request',
    webviewLoadStart.bind(webview, tabId)
  );
  webview.addEventListener('new-window', webviewLoadStart.bind(webview, tabId));

  // MIST API for installed tabs/dapps
  webview.addEventListener(
    'ipc-message',
    mistAPIBackend.bind({
      template: template,
      webview: webview
    })
  );
});

Template['views_webview'].helpers({
  /**
    Gets the correct preloader file

    @method (preloaderFile)
    */
  preloaderFile: function() {
    switch (this._id) {
      case 'browser':
        return 'file://' + Helpers.preloaderDirname + '/browser.js';
      case 'tests':
        return 'file://' + Helpers.preloaderDirname + '/tests.js';
      default:
        return 'file://' + Helpers.preloaderDirname + '/dapps.js';
    }
  },
  /**
    Determines if the current tab is visible

    @method (isVisible)
    */
  isVisible: function() {
    return LocalStore.get('selectedTab') === this._id ? '' : 'hidden';
  },
  /**
    Gets the current url

    @method (checkedUrl)
    */
  checkedUrl: function() {
    var template = Template.instance();
    var tab = Tabs.findOne(this._id, { fields: { redirect: 1 } });
    var url;

    if (tab) {
      // set url only once
      if (tab.redirect) {
        url = tab.redirect;

        // remove redirect
        Tabs.update(this._id, {
          $unset: {
            redirect: ''
          }
        });
      }

      // allow error pages
      if (url && url.indexOf(`file://${dirname}/errorPages/`) === 0) {
        return url;
      }

      // allow local wallet
      if (url && url.indexOf(`file://${dirname}/wallet/index.html`) === 0) {
        return url;
      }

      // CHECK URL and throw error if not allowed
      if (!Helpers.sanitizeUrl(url, true)) {
        // Prevent websites using the history back attacks
        if (template.view.isRendered) {
          // get the current webview
          var webview = template.find('webview');
          webview.clearHistory();
        }

        console.warn('Not allowed URL: ' + template.url);
        return 'file://' + dirname + '/errorPages/400.html';
      }

      // add url
      if (url) {
        template.url = url;
        Tabs.update(this._id, {
          $set: {
            url: url
          }
        });
      }

      return Helpers.formatUrl(url);
    }
  }
});
