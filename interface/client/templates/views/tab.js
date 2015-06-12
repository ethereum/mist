/**
Template Controllers

@module Templates
*/


/**
The tab template

@class [template] views_tab
@constructor
*/

Template['views_tab'].onCreated(function(){
    this._url;
});


Template['views_tab'].onRendered(function(){
    var template = this,
        timeoutId;

    this.find('webview').addEventListener('did-start-loading', function(e){
        TemplateVar.set(template, 'loading', true);

        // timeout spinner after 10s
        // timeoutId = Meteor.setTimeout(function(){
        //     TemplateVar.set(template, 'loading', false);
        // }, 10 * 1000);
    });
    this.find('webview').addEventListener('did-stop-loading', function(e){
        // Meteor.clearTimeout(timeoutId);
        TemplateVar.set(template, 'loading', false);
        webviewLoadStop.apply(this, e);
    });
    this.find('webview').addEventListener('did-get-redirect-request', webviewLoadStart);
    this.find('webview').addEventListener('new-window', function(e){
        Tabs.update(template.data._id, {$set: {url: e.url}});
    });
});


Template['views_tab'].helpers({
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