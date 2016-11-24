/**
Template Controllers

@module Templates
*/


Template['popupWindows_clientUpdateAvailable'].events({
    'click .ok': function(e){
        ipc.send('backendAction_windowCallback', true);
    },
    'click .cancel': function(e){
        ipc.send('backendAction_windowCallback', false);
    }
});
