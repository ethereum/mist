/**
Template Controllers

@module Templates
*/


Template['popupWindows_clientUpdateAvailable'].events({
    'click .yes': function(e){
        ipc.send('backendAction_windowCallback', true);
    },
    'click .no': function(e){
        ipc.send('backendAction_windowCallback', false);
    }
});
