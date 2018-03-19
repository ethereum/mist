/**
Template Controllers

@module Templates
*/

/**
The updateAvailable template

@class [template] popupWindows_updateAvailable
@constructor
*/
Template['popupWindows_updateAvailable'].onCreated(function() {
  var template = this;

  TemplateVar.set(template, 'checking', true);

  /*
    When app update check is in progress it.
     */
  ipc.on('uiAction_checkUpdateInProgress', function(e, update) {
    console.debug('Update check in progress...');

    TemplateVar.set(template, 'checking', true);
  });

  /*
    When app update data is received display it.
     */
  ipc.on('uiAction_checkUpdateDone', function(e, update) {
    console.debug('Update check done');

    TemplateVar.set(template, 'checking', false);

    if (update) {
      TemplateVar.set(template, 'update', update);
    }
  });
});

Template['popupWindows_updateAvailable'].events({
  'click .get-update': function(e) {
    var update = TemplateVar.get('update');

    if (update && update.url) {
      ipc.send('backendAction_openExternalUrl', update.url);
    }
  }
});
