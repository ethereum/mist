/**
Template Controllers

@module Templates
*/


/**
The browserBar keyinfo template

@class [template] layout_browserBar_accounts
@constructor
*/

/**
Checks whether the given address has permission for the current tab.

method hasPermission
*/
var hasPermission = function(tab, address) {
    return (tab &&
            tab.permissions &&
            tab.permissions.accounts &&
            _.contains(tab.permissions.accounts, address));
};


Template['layout_browserBar_accounts'].onCreated(function(){
    this.autorun(function(){
        // make reeactive to the tab change
        var tab = Tabs.findOne(LocalStore.get('selectedTab'), {fields: {'permissions.accounts': 1}}),
            accounts = (tab.permissions &&  tab.permissions.accounts) ? tab.permissions.accounts : [];

        TemplateVar.set('accounts', accounts);
    });
});


Template['layout_browserBar_accounts'].helpers({
    /**
    Return "selected" if the current account is allowed in that dapp.

    @method selected
    @return {String} "selected"
    */
    'selected': function(){
        return (_.contains(TemplateVar.get('accounts'), this.address)) ? 'selected' : '';
        // return hasPermission(this.address) ? 'selected' : '';
    },
    /**
    Return the number of accounts this tab has permission for.

    @method accountNumber
    @return {Number}
    */
    'accountNumber': function(){
        var accounts = _.pluck(EthAccounts.find().fetch(), 'address');

        return _.intersection(accounts, TemplateVar.get('accounts')).length;

        // var tab = Tabs.findOne(LocalStore.get('selectedTab'));
        // return (tab &&
        //     tab.permissions &&
        //     tab.permissions.accounts) ? tab.permissions.accounts.length : 0;
    }
});


Template['layout_browserBar_accounts'].events({
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

            // reload the webview
            Helpers.getWebview(tabId).reload();

            // hide the sidebar
            $('.app-bar').removeClass('show-bar');
        });
    },
    /**
    Select the accounts available for this dapp.

    @event click .dapp-account-list button
    */
    'click .dapp-account-list button': function(e, template) {
        var accounts = TemplateVar.get('accounts');

        if(!_.contains(accounts, this.address))
            accounts.push(this.address);
        else
            accounts = _.without(accounts, this.address);

        TemplateVar.set(template, 'accounts', accounts);
        // var tabId = LocalStore.get('selectedTab');


        // if(!hasPermission(this.address)) {
        //     Tabs.update(tabId, {$addToSet: {
        //         'permissions.accounts': this.address
        //     }});
        // } else {
        //     Tabs.update(tabId, {$pull: {
        //         'permissions.accounts': this.address
        //     }});
        // }
    },
    /**
    Confirm or cancel the accounts available for this dapp and reload the dapp.

    @event click button.confirm, click button.cancel
    */
    'click button.confirm, click button.cancel': function(e) {
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
    }
});
