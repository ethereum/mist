
Template['popupWindows_forkChoice'].onCreated(function(){


})


Template['popupWindows_forkChoice'].events({
    /**
    Select DAO fork

    @events
    */
    'click .fork-yes button': function(){
        ipc.send('forkChoice_choosen', 'true');
    },
    /**
    Reject DAO fork

    @events
    */
    'click .fork-no button': function(){
        ipc.send('forkChoice_choosen', 'false');
    },
    /**
    Follow default

    @events
    */
    'click .fork-whatever a': function(e){
        e.preventDefault();
        ipc.send('forkChoice_choosen', null);
    }
});