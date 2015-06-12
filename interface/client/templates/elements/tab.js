/**
Template Controllers

@module Templates
*/


/**
The tab template

@class [template] elements_tab
@constructor
*/

Template['elements_tab'].onCreated(function(){
    this._url;
});


Template['elements_tab'].onRendered(function(){
    this.find('webview').addEventListener('did-stop-loading', webviewLoadStop);
    this.find('webview').addEventListener('did-get-redirect-request', webviewLoadStart);
});


Template['elements_tab'].helpers({
    /**
    Determines if the current tab is visible

    @method (isVisible)
    */
    'isVisible': function(){
        return (LocalStore.get('selectedTab') === this._id) ? '' : 'hidden';
    },
    /**
    Gets the current url

    @method (url)
    */
    'url': function(){
        var template = Template.instance();
        var tab = Tabs.findOne(this._id, {fields: {url: 1}});
        
        if(tab) {
            // set url only once
            if(tab.redirect) {
                template.url = tab.redirect;
                Tabs.update(this._id, {$unset: {redirect: ''}});
            } else if(!template.url)
                template.url = tab.url;

            return template.url;
        }
    }
});