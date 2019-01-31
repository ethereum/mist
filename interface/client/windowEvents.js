// add the platform to the HTML tag
setTimeout(function() {
  document.getElementsByTagName('html')[0].className = window.mist.platform;

  if (window.basePathHref) {
    var base = document.createElement('base');

    base.href = window.basePathHref;

    document.getElementsByTagName('head')[0].appendChild(base);
  }
}, 200);

$(window).on('blur', function(e) {
  $('body').addClass('app-blur');
});
$(window).on('focus', function(e) {
  $('body').removeClass('app-blur');
});

// make sure files can only be dropped in the browser webview
$(window).on('dragenter', function(e) {
  LocalStore.set('selectedTab', 'browser');
  ipc.send('backendAction_focusMainWindow');
});

$(window).on('keydown', function(e) {
  // Select tab with index when number is 1-8
  if (e.metaKey && e.keyCode >= 49 && e.keyCode <= 56) {
    var index = parseInt(String.fromCharCode(e.keyCode), 10) - 1;
    Helpers.selectTabWithIndex(index);
    return;
  }

  // RELOAD current webview
  if (
    LocalStore.get('selectedTab') !== 'wallet' &&
    e.metaKey &&
    e.keyCode === 82
  ) {
    var webview = Helpers.getWebview(LocalStore.get('selectedTab'));
    if (webview) {
      webview.reloadIgnoringCache();
    }
    return;
  }

  // Select last tab on Ctrl + 9
  if (e.metaKey && e.keyCode === 57) {
    Helpers.selectLastTab();
    return;
  }

  // Ctrl + tab || Ctrl + shift + tab
  if (e.ctrlKey && e.keyCode === 9) {
    var tabOffset = e.shiftKey ? -1 : 1;
    Helpers.selectTabWithOffset(tabOffset);
  }
});
