

var pinToSidebar = function() {
    var webview = $('webview[data-id="browser"]')[0];

    if(webview) {
        var id = Tabs.insert({
            url: webview.getURL(),
            name: webview.getTitle(),
            menu: {},
            menuVisible: false,
            position: Tabs.find().count() + 1
        });

        // move the current browser tab to the last visited page
        var lastPage = DoogleLastVisitedPages.find({},{limit: 2, sort: {timestamp: -1}}).fetch();
        Tabs.update('browser', {
            url: lastPage[1] ? lastPage[1].url : 'http://about:blank',
            redirect: lastPage[1] ? lastPage[1].url : 'http://about:blank'
        });

        LocalStore.set('selectedTab', id);
    }
};

var updateSelectedTabAccounts = function(accounts){
    var tabId = LocalStore.get('selectedTab');
    Tabs.update(tabId, {$set: {
        'permissions.accounts': accounts
    }});
};

Template['popupWindows_connectAccount'].onCreated(function() {

    TemplateVar.set('currentActive', 'connect');

    this.autorun(function(){
        var tab = Tabs.findOne(LocalStore.get('selectedTab'), {fields: {'permissions.accounts': 1}});
        var accounts = (tab && tab.permissions &&  tab.permissions.accounts) ? tab.permissions.accounts : [];
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
        return Tabs.findOne(LocalStore.get('selectedTab'))
        // .url.
        // replace(/^https?:\/\/(www\.)?/, '').
        // replace(/\/$/, '');
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

    'selectedAccounts': function() {
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

	'click .cancel': function(e) {
		ipc.send('backendAction_closePopupWindow');
	},

    'click .stay-anonymous': function(e) {
        e.preventDefault();

        var tabId = LocalStore.get('selectedTab');

        // removes permissions
        updateSelectedTabAccounts([]);

        // reload the webview
        // ipc.send('backendAction_reloadSelectedTab');
        ipc.send('backendAction_sendToOwner', null, null);
        ipc.send('backendAction_closePopupWindow');
    },
    /**
    Confirm or cancel the accounts available for this dapp and reload the dapp.

    @event click button.confirm, click button.cancel
    */
    'click .ok': function(e) {
        e.preventDefault();

        var tabId = LocalStore.get('selectedTab'),
            accounts = TemplateVar.get('accounts');

        // set new permissions
        Tabs.update(tabId, {$set: {
            'permissions.accounts': accounts
        }});

        // Pin to sidebar, if needed
        if ($('#pin-to-sidebar')[0].checked) {
            // pinToSidebar();
        }

        // reload the webview
        // ipc.send('backendAction_reloadSelectedTab');
        // ipc.send('uiAction_reloadSelectedTab');
        ipc.send('backendAction_sendToOwner', null, null);
        ipc.send('backendAction_closePopupWindow');
    },

    /**
    Create account

    @event click button.create-account
    */
    'click button.create-account': function(e, template){
        ipc.send('mistAPI_createAccount');
        // mist.requestAccount(function(e, address){
        //     console.debug('Got new account', address);

        //     var tabId = LocalStore.get('selectedTab'),
        //     accounts = TemplateVar.get(template, 'accounts');

        //     accounts.push(address);

        //     TemplateVar.set(template, 'accounts', accounts);

        //     updateSelectedTabAccounts(tabId, accounts);
        //     // set new permissions
        //     Tabs.update(tabId, {$set: {
        //         'permissions.accounts': accounts
        //     }});
        // });
    },
});
