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
    Show the add button, when on a dapp and in doogle

    @method (showAddButton)
    */
    'showAddButton': function(){
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
    Add the current selected URL as tab

    @event click button.add-tab
    */
    'click button.add-tab': function(){
        var url = Session.get('browserQuery'),
            webview = $('#browser-view')[0];

        if(webview) {
            Tabs.insert({
                url: webview.getUrl(),
                name: webview.getTitle(),
                menu: [],
                menuVisible: false
            });
        }
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
