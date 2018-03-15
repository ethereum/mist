/**
Template Controllers

@module Templates
*/

Template['popupWindows_clientUpdateAvailable'].events({
  'click .ok': function(e) {
    ipc.send('backendAction_windowCallback', 'update');
  },
  'click .cancel': function(e) {
    ipc.send('backendAction_windowCallback', 'skip');
  }
});
