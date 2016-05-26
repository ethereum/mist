/**
Template Controllers

@module Templates
*/

/**
The browserBar template

@class [template] layout_browserBar
@constructor
*/

Template['layout_browserBar'].onRendered(function(){
    var template = this;
});


Template['layout_browserBar'].helpers({
    /**
    Break the URL in protocol, domain and folders

    @method (breadcrumb)
    */
    'breadcrumb': function(){
        if(!this || !this.url)
            return;

        var pattern  = /([^\:]*)\:\/\/([^\/]*)\/([^\?\.]*)/
        var search = this.url.match(pattern);

        if(!search)
            return;

        var urlObject = {
            url: search[0],
            protocol: search[1],
            domain: search[2].split("."),
            folders: search[3].split("/"),
        }

        var breadcrumb = "<span>" + urlObject.domain.join(".") + " </span> ▸ " + urlObject.folders.join(" ▸ ");

        return new Spacebars.SafeString(breadcrumb);
    },
    /**
    Returns the current dapp

    @method (dapp)
    */
    'dapp': function(){
        return Tabs.findOne(LocalStore.get('selectedTab'));
    },
    /**
    Returns dapps current accounts

    @method (dappAccounts)
    */
    'dappAccounts': function(){
        if(this.permissions)
            return EthAccounts.find({address: {$in: this.permissions.accounts || []}});
    },
    /**
    Show the add button, when on a dapp and in doogle

    @method (isBrowser)
    */
    'isBrowser': function(){
        return (LocalStore.get('selectedTab') === 'browser');
    },
    /**
    Current selected view

    @method (currentWebView)
    */
    'currentWebView': function(){
        return '.tab-view webview[data-id="'+ LocalStore.get('selectedTab') +'"]';
    }
});

Template['layout_browserBar'].events({
    /*
    Go back in the dapps browser history

    @event click button.back
    */
    'click button.back': function(){
        var webview = Helpers.getWebview(LocalStore.get('selectedTab'));

        if(webview && webview.canGoBack())
            webview.goBack();
    },
    /*
    Reload the current webview

    @event click button.reload
    */
    'click button.reload': function(){
        var webview = Helpers.getWebview(LocalStore.get('selectedTab'));
        
        if(webview)
            webview.reload();
    },
    /*
    Add the current selected URL as tab

    @event click button.add-tab
    */
    'click button.add-tab': function(){
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
    },
    /*
    Remove the current selected tab

    // TODO show popup before to confirm

    @event click button.remove-tab
    */
    'click button.remove-tab': function(){
        var tabId = LocalStore.get('selectedTab');
        
        Tabs.remove(tabId);
        LocalStore.set('selectedTab', 'browser');
    },
    /*
    Show the app bar

    @event click app-bar > button, click .app-bar > form
    */
    'click .app-bar > button, click .app-bar > form': function(e, template){
        // prevent the slide in, when the url is clicked
        if($(e.target).hasClass('url-input'))
            return;

        template.$('.app-bar').toggleClass('show-bar');
    },
    /*
    Hide the app bar

    @event mouseleave .app-bar
    */
    'mouseleave .app-bar': function(e, template){
        var timeoutId = setTimeout(function(){
            template.$('.app-bar').removeClass('show-bar');
        }, 1000);
        TemplateVar.set('timeoutId', timeoutId);
    },
    /*
    Stop hiding the app bar

    @event mouseenter .app-bar
    */
    'mouseenter .app-bar': function(e, template){
        clearTimeout(TemplateVar.get('timeoutId'));
    },
    /*
    Show the sections

    @event click button.accounts, click button.dapp-info, click form.url
    */
    'click button.accounts, click button.dapp-info, click form.url': function(e, template){
        var className = $(e.currentTarget).attr('class');

        if(TemplateVar.get('browserBarTab') !== className)
            template.$('.app-bar').addClass('show-bar');

        TemplateVar.set('browserBarTab', className);
    },
    /*
    Focus the input

    @event click form.url
    */
    'click form.url': function(e, template){
        template.$('.url-input').select();
    },
    /*
    Send the domain

    @event submit
    */
    'submit': function(e, template){     
        var tabs = Tabs.find().fetch(),
            url = Helpers.formatUrl(template.$('.url-input')[0].value);

        // remove focus from url input
        template.$('.url-input').blur();

        // look in tabs
        var foundTab = _.find(tabs, function(tab){
                if(tab.url && tab.url.indexOf('about:blank') === -1) {
                    var tabOrigin = new URL(tab.url).origin;
                    return (tabOrigin && url.indexOf(tabOrigin) !== -1);
                }
            });

        // switch tab to browser
        if(foundTab)
            foundTab = foundTab._id;
        else
            foundTab = 'browser';

        // update current tab url
        Tabs.update(foundTab, {$set: {
            url: url,
            redirect: url
        }});
        LocalStore.set('selectedTab', foundTab);

        // hide the app-bar
        template.$('.app-bar').removeClass('show-bar');
    }
});
