
Template['popupWindows_forkChoice'].onCreated(function(){


})


Template['popupWindows_forkChoice'].events({
    /**
    Select DAO fork

    @events
    */
    'click .fork-yes button': function(){
        ipc.send('forkChoice_choosen', 'fork');
    },
    /**
    Reject DAO fork

    @events
    */
    'click .fork-no button': function(){
        ipc.send('forkChoice_choosen', 'no-fork');
    }
});