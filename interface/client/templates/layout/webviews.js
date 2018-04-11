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
Set TemplateVar 'loading' whether node connection is active
@method watchNodeStatus
*/
var watchNodeStatus = function(template) {
    if (store.getState().nodes.remote.blockNumber > 1000 || store.getState().nodes.local.blockNumber > 1000) {
      TemplateVar.set(template, 'loading', false);
    }

    this.storeUnsubscribe = store.subscribe(() => {
      if (store.getState().nodes.remote.blockNumber > 1000 || store.getState().nodes.local.blockNumber > 1000) {
        TemplateVar.set(template, 'loading', false);
      }
    });
}