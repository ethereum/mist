

Template['popupWindows_connectAccount'].onCreated(function() {

    TemplateVar.set('currentActive', 'connect');

    this.autorun(function(){
        var tab = Tabs.findOne(LocalStore.get('selectedTab'), {fields: {'permissions.accounts': 1}});
        var accounts = (tab && tab.permissions &&  tab.permissions.accounts) ? tab.permissions.accounts : [];

        console.info('accounts', accounts);
        console.info(typeof accounts);
        TemplateVar.set('accounts', accounts);
    });
});


Template['popupWindows_connectAccount'].helpers({
    /**
    Returns the current dapp

    @method (dapp)
    */
    dapp: function(){
        return Tabs.findOne(LocalStore.get('selectedTab'));
    },
    /**
    Returns a cleaner version of URL

    @method (dappFriendlyURL)
    */
    dappFriendlyURL: function(){
        return Tabs.findOne(LocalStore.get('selectedTab')).url.
        replace(/^https?:\/\/(www\.)?/, '').
        replace(/\/$/, '');
    },

    currentAccount: function(){
        return TemplateVar.get('accounts')[0];
    },
});

Template['popupWindows_connectAccount'].events({
    'click .switch-account': function(){
        TemplateVar.set('currentActive', 'switch');
    },

    'click .switch-card': function(event){
        event.preventDefault();
        TemplateVar.set('currentActive', 'connect');
    },

	'click .cancel': function(){
		ipc.send('backendAction_closePopupWindow');
	},

    'click .ok': function(event){
        event.preventDefault();
        ipc.send('backendAction_closePopupWindow');
    },
});
