/**
Template Controllers

@module Templates
*/
Template['layout_webviews'].onCreated(function() {
  var template = this;
  TemplateVar.set(template, 'loading', true);
  watchNodeStatus(template);
});

Template['layout_webviews'].onDestroyed(function() {
  if (this.storeUnsubscribe) {
    this.storeUnsubscribe();
  }
});

/**
The main section template

@class [template] layout_webviews
@constructor
*/
Template['layout_webviews'].helpers({
  /**
    Return the tabs
    @method (tabs)
    */
  tabs: function() {
    return Tabs.find({}, { field: { position: 1 } });
  }
});

/**
Set TemplateVar 'loading' if node has connected 
@method watchNodeStatus
*/
var watchNodeStatus = function(template) {
  if (meteorEnv.NODE_ENV === 'test') {
    TemplateVar.set(template, 'loading', false);
    return;
  }

  if (
    store.getState().nodes.remote.blockNumber > 100 ||
    store.getState().nodes.local.blockNumber > 0
  ) {
    TemplateVar.set(template, 'loading', false);
  }

  this.storeUnsubscribe = store.subscribe(() => {
    if (
      store.getState().nodes.remote.blockNumber > 100 ||
      store.getState().nodes.local.blockNumber > 0
    ) {
      TemplateVar.set(template, 'loading', false);
    }
  });
};
