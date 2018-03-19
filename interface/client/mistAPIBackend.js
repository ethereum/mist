/**
@module MistAPI Backend
*/

var allowedBrowserBarStyles = ['transparent'];

/**
Filters a id the id to only contain a-z A-Z 0-9 _ -.

@method filterId
*/
var filterId = function(str) {
  var newStr = '';
  var i;
  for (i = 0; i < str.length; i += 1) {
    if (/[a-zA-Z0-9_-]/.test(str.charAt(i))) {
      newStr += str.charAt(i);
    }
  }
  return newStr;
};

var sound = document.createElement('audio');

/**
The backend side of the mist API.

@method mistAPIBackend
*/
mistAPIBackend = function(event) {
  var template = this.template;
  var webview = this.webview;
  var arg = event.args[0];

  // console.trace('mistAPIBackend event', event);

  if (event.channel === 'setWebviewId') {
    Tabs.update(template.data._id, {
      $set: { webviewId: webview.getWebContents().id }
    });
  }

  // Send TEST DATA
  if (event.channel === 'sendTestData') {
    var tests = Tabs.findOne('tests');

    if (tests) {
      web3.eth.getCoinbase(function(e, coinbase) {
        webview.send('uiAction_sendTestData', tests.permissions, coinbase);
      });
    }
  }

  // SET FAVICON
  if (event.channel === 'favicon') {
    Tabs.update(template.data._id, {
      $set: {
        icon: Blaze._escape(arg || '')
      }
    });
  }

  // SET APPBAR
  if (event.channel === 'appBar') {
    var appBarClass = Blaze._escape(arg || '');

    Tabs.update(template.data._id, {
      $set: {
        appBar: _.contains(allowedBrowserBarStyles, appBarClass)
          ? appBarClass
          : null
      }
    });
  }
  if (event.channel === 'mistAPI_sound') {
    sound.pause();
    sound.src = Blaze._escape('file://' + dirname + '/sounds/' + arg + '.mp3');
    sound.play();
  }

  // STOP HERE, IF BROWSER
  if (template.data._id === 'browser') {
    return;
  }

  // Actions: --------

  if (event.channel === 'mistAPI_setBadge') {
    Tabs.update(template.data._id, {
      $set: {
        badge: arg
      }
    });
  }

  if (event.channel === 'mistAPI_menuChanges' && arg instanceof Array) {
    arg.forEach(function(eventArg) {
      var query;

      if (eventArg.action === 'addMenu') {
        // filter ID
        if (eventArg.entry && eventArg.entry.id) {
          eventArg.entry.id = filterId(eventArg.entry.id);
        }

        query = { $set: {} };

        if (eventArg.entry.id) {
          query.$set['menu.' + eventArg.entry.id + '.id'] = eventArg.entry.id;
        }

        query.$set['menu.' + eventArg.entry.id + '.selected'] = !!eventArg.entry
          .selected;

        if (!_.isUndefined(eventArg.entry.position)) {
          query.$set['menu.' + eventArg.entry.id + '.position'] =
            eventArg.entry.position;
        }
        if (!_.isUndefined(eventArg.entry.name)) {
          query.$set['menu.' + eventArg.entry.id + '.name'] =
            eventArg.entry.name;
        }
        if (!_.isUndefined(eventArg.entry.badge)) {
          query.$set['menu.' + eventArg.entry.id + '.badge'] =
            eventArg.entry.badge;
        }

        Tabs.update(template.data._id, query);
      }

      if (eventArg.action === 'selectMenu') {
        var tab = Tabs.findOne(template.data._id);

        for (var e in tab.menu) {
          if ({}.hasOwnProperty.call(tab.menu, e)) {
            tab.menu[e].selected = e === eventArg.id;
          }
        }
        Tabs.update(template.data._id, { $set: { menu: tab.menu } });
      }

      if (eventArg.action === 'removeMenu') {
        var removeQuery = { $unset: {} };

        removeQuery.$unset['menu.' + eventArg.id] = '';

        Tabs.update(template.data._id, removeQuery);
      }

      if (eventArg.action === 'clearMenu') {
        Tabs.update(template.data._id, { $set: { menu: {} } });
      }
    });
  }
};
