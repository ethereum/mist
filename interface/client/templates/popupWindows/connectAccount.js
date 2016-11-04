

var pinToSidebar = function() {
    var selectedTab = Tabs.findOne(LocalStore.get('selectedTab'));

    if(selectedTab) {
        var existingUserTab = _.find(Tabs.find().fetch(), function(tab){
          return tab._id !== 'browser' && tab.url === selectedTab.url;
        });

        if (!existingUserTab) {
            var newTabId = Tabs.insert({
                url: selectedTab.url,
                name: selectedTab.name,
                menu: {},
                menuVisible: false,
                position: Tabs.find().count() + 1
            });
            LocalStore.set('selectedTab', newTabId);
        }

        console.log('tab info', selectedTab);
        if (selectedTab._id === 'browser') {
            // move the current browser tab to the last visited page
            var lastPage = DoogleLastVisitedPages.find({},{limit: 2, sort: {timestamp: -1}}).fetch();
            Tabs.update('browser', {
                url: lastPage[1] ? lastPage[1].url : 'http://about:blank',
                redirect: lastPage[1] ? lastPage[1].url : 'http://about:blank'
            });
        }
    }
};

var updateSelectedTabAccounts = function(accounts){
    var tabId = LocalStore.get('selectedTab');
    Tabs.update(tabId, {$set: {
        'permissions.accounts': accounts
    }});
};

Template['popupWindows_connectAccount'].onCreated(function() {
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
        var currentTab = Tabs.findOne(LocalStore.get('selectedTab'))
        if (currentTab && currentTab.url){
            return currentTab.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
        }
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
    /**
    Return an array with the selected accounts.

    @method selectedAccounts
    @return {Array}
    */
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
    }
});

Template['popupWindows_connectAccount'].events({
    /**
    Toggles dapp account list selection.

    @event click .dapp-account-list button
    */
    'click .dapp-account-list button': function(e, template) {
        e.preventDefault();
        var accounts = TemplateVar.get('accounts');

        if(!_.contains(accounts, this.address))
            accounts.push(this.address);
        else
            accounts = _.without(accounts, this.address);

        TemplateVar.set(template, 'accounts', accounts);
    },
    /** 
    Closes the popup

    @event click .cancel
    */
	'click .cancel': function(e) {
		ipc.send('backendAction_closePopupWindow');
	},
    /**
    - Confirm or cancel the accounts available for this dapp and reload the dapp.

    @event click button.confirm, click button.cancel
    */
    'click .ok, click .stay-anonymous': function(e) {
        e.preventDefault();

        var accounts = TemplateVar.get('accounts');
        
        // Pin to sidebar, if needed
        if ($('#pin-to-sidebar')[0].checked) {
            pinToSidebar();
        }

        // reload the webview
        ipc.send('backendAction_sendToOwner', null, accounts);
        ipc.send('backendAction_closePopupWindow');
    },
    /**
    Create account

    @event click button.create-account
    */
    'click button.create-account': function(e, template){
        ipc.send('mistAPI_createAccount');
    }
});
