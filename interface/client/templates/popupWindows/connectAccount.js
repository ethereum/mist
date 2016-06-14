

Template['popupWindows_connectAccount'].onCreated(function() {

    TemplateVar.set('currentActive', 'sharingInfo');

    // this.autorun(function(){
    //     // make reeactive to the tab change
    //     var tab = Tabs.findOne(LocalStore.get('selectedTab'), {fields: {'permissions.accounts': 1}});
    //     console.info(tab);
    //     var accounts = (tab.permissions &&  tab.permissions.accounts) ? tab.permissions.accounts : [];

    //     TemplateVar.set('accounts', accounts);
    // });
});


Template['popupWindows_connectAccount'].helpers({
    /**
    Returns the current dapp

    @method (dapp)
    */
    'dapp': function(){
        return Tabs.findOne(LocalStore.get('selectedTab'));
    },
    /**
    Returns a more clean version of URL

    @method (dappFriendlyURL)
    */    'dappFriendlyURL': function(){
        return Tabs.findOne(LocalStore.get('selectedTab')).url.
        replace(/^https?:\/\/(www\.)?/, '').
        replace(/\/$/, '');
    },
    /**
    Returns dapps current accounts

    @method (dappAccounts)
    */
    'dappAccounts': function(){
        if(this.permissions)
            return EthAccounts.find({address: {$in: this.permissions.accounts || []}});
    },

});

Template['popupWindows_connectAccount'].helpers({

});

Template['popupWindows_connectAccount'].events({
    'click .chooseAccount': function(){
        TemplateVar.set('currentActive', 'switchAccount');
    },

	'click .cancel': function(){
		console.log('Cancel button');
		ipc.send('backendAction_closePopupWindow');
	},

    'click .ok': function(event){
        event.preventDefault();
        console.log('ok clicked');
        ipc.send('backendAction_closePopupWindow');
    }
});
