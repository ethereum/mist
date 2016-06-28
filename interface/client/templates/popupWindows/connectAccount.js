

var pinToSidebar = function() {
    
};


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

    /**
    Return the number of accounts this tab has permission for.

    @method accountNumber
    @return {Number}
    */
    'accountNumber': function(){
        var accounts = _.pluck(EthAccounts.find().fetch(), 'address');

        return _.intersection(accounts, TemplateVar.get('accounts')).length;
    },

    'accountList': function() {
        var accounts = _.pluck(EthAccounts.find().fetch(), 'address');

        return _.intersection(accounts, TemplateVar.get('accounts'));
    },
    /**
    Return "selected" if the current account is allowed in that dapp.

    @method selected
    @return {String} "selected"
    */
    'selected': function(){
        return (_.contains(TemplateVar.get('accounts'), this.address)) ? 'selected' : '';
        // return hasPermission(this.address) ? 'selected' : '';
    },
});

Template['popupWindows_connectAccount'].events({
    'click .switch-account': function(){
        TemplateVar.set('currentActive', 'switch');
    },

    'click .dapp-account-list button': function(e, template) {
        e.preventDefault();
        var accounts = TemplateVar.get('accounts');

        if(!_.contains(accounts, this.address))
            accounts.push(this.address);
        else
            accounts = _.without(accounts, this.address);

        TemplateVar.set(template, 'accounts', accounts);
    },

	'click .cancel': function(){
		ipc.send('backendAction_closePopupWindow');
	},

    'click .stay-anonymous': function() {
        var tabId = LocalStore.get('selectedTab');

        // removes permissions
        Tabs.update(tabId, {$set: {
            'permissions.accounts': []
        }});

        // reload the webview
        console.info(LocalStore.get('selectedTab'));
        console.log(typeof Helpers.getWebview(tabId));
        console.info(Helpers.getWebview(tabId));
        Helpers.getWebview(tabId).reload();
    },
    /**
    Confirm or cancel the accounts available for this dapp and reload the dapp.

    @event click button.confirm, click button.cancel
    */
    'click .ok': function(e) {
        var tabId = LocalStore.get('selectedTab'),
            accounts = ($(e.currentTarget).hasClass('confirm')) ? TemplateVar.get('accounts') : [],
            tab = Tabs.findOne(tabId, {fields: {'permissions.accounts': 1}});

        // set new permissions
        Tabs.update(tabId, {$set: {
            'permissions.accounts': accounts
        }});

        // reload the webview
        Helpers.getWebview(tabId).reload();

        // hide the sidebar
        $('.app-bar').removeClass('show-bar');
    },

    /**
    Create account

    @event click button.create-account
    */
    'click button.create-account': function(e, template){
        mist.requestAccount(function(e, address){
            console.debug('Got new account', address);

            var tabId = LocalStore.get('selectedTab'),
            accounts = TemplateVar.get(template, 'accounts');

            accounts.push(address);

            TemplateVar.set(template, 'accounts', accounts);

            // set new permissions
            Tabs.update(tabId, {$set: {
                'permissions.accounts': accounts
            }});
        });
    },
});
