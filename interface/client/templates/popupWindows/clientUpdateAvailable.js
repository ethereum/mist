/**
Template Controllers

@module Templates
*/

/**
The clientUpdateAvailable template

@class [template] popupWindows_clientUpdateAvailable
@constructor
*/
Template['popupWindows_clientUpdateAvailable'].onCreated(function(){
    var template = this;

    /*
    When app update data is received display it.
     */
    ipc.on('uiAction_clientUpdateAvailable', function(e, update) {
        if (update) {
            TemplateVar.set(template, 'update', update);
        }
    });
});


Template['popupWindows_clientUpdateAvailable'].events({
   'click .get-update': function(e){
        ipc.send('backendAction_confirmClientUpdate');
    },
});
