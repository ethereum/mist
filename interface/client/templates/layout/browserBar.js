/**
Template Controllers

@module Templates
*/

/**
The browserBar template

@class [template] layout_browserBar
@constructor
*/

Template['layout_browserBar'].rendered = function(){

};


Template['layout_browserBar'].helpers({
    /**
    Get the current value

    @method (currentUrl)
    */
    'currentUrl': function(){
        var tabId = LocalStore.get('selectedTab'),
            tab = Tabs.findOne(tabId);

        return (tabId === 'browser' || !tab) ? Session.get('browserQuery') : Tabs.findOne(tabId).url;
    },
    /**
    Break the URL in protocol, domain and folders

    @method (breadcrumb)
    */
    'breadcrumb': function(){
        var tabId = LocalStore.get('selectedTab'),
            tab = Tabs.findOne(tabId);

        var url = (tabId === 'browser' || !tab) ? Session.get('browserQuery') : Tabs.findOne(tabId).url;
        var pattern  = /([^\:]*)\:\/\/([^\/]*)\/([^\?\.]*)/
        var search = url.match(pattern);
        var urlObject = {
            url: search[0],
            protocol: search[1],
            domain: search[2].split("."),
            folders: search[3].split("/"),
        }

        var breadcrumb = "<span>" + urlObject.domain.reverse().join(" » ") + " </span> » " + urlObject.folders.join(" » ");

        return breadcrumb;
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
        if(LocalStore.get('selectedTab') === 'browser')
            return '.browse-view';
        else
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
        var url = Session.get('browserQuery'),
            webview = $('#browser-view')[0];

        if(webview) {
            var id = Tabs.insert({
                url: webview.getUrl(),
                name: webview.getTitle(),
                menu: {},
                menuVisible: false,
                position: Tabs.find().count() + 1
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
    Send the domain

    @event submit
    */
    'submit': function(e, template){     
        var tabs = Tabs.find().fetch(),
            url = Helpers.formatUrl(template.find('input').value);


        // switch to tab
        if(foundTab = _.find(tabs, function(tab){
                var tabOrigin = new URL(tab.url).origin;
                return (url.indexOf(tabOrigin) !== -1);
            })) {


            // update current tab url
            Tabs.update(foundTab._id, {$set: {
                url: url,
                redirect: url
            }});
            LocalStore.set('selectedTab', foundTab._id);

        // switch tab to browser
        } else {
            
            Session.set('browserQuery', url);
            LocalStore.set('selectedTab', 'browser');
        }
    }
});
