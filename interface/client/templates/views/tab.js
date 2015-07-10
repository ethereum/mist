/**
Template Controllers

@module Templates
*/

/**
Filters a id the id to only contain a-z A-Z 0-9 _ -.

@method filterId
*/
var filterId = function(str) {
    var newStr = '';
    for (var i = 0; i < str.length; i++) {
        if(/[a-zA-Z0-9_-]/.test(str.charAt(i)))
            newStr += str.charAt(i);
    };
    return newStr;
};

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
        webview = this.find('webview'),
        timeoutId;

    webview.addEventListener('did-start-loading', function(e){
        TemplateVar.set(template, 'loading', true);

        // timeout spinner after 10s
        // timeoutId = Meteor.setTimeout(function(){
        //     TemplateVar.set(template, 'loading', false);
        // }, 10 * 1000);
    });
    webview.addEventListener('did-stop-loading', function(e){
        // Meteor.clearTimeout(timeoutId);
        TemplateVar.set(template, 'loading', false);

        // update the title
        Tabs.update(template.data._id, {$set: {name: webview.getTitle()}});

        webviewLoadStop.apply(this, e);
    });
    webview.addEventListener('did-get-redirect-request', webviewLoadStart);
    webview.addEventListener('new-window', function(e){
        Tabs.update(template.data._id, {$set: {redirect: e.url}});
    });


    // MIST API for installed tabs/dapps
    webview.addEventListener('ipc-message', function(event) {
        var arg = event.args[0];

        // SET FAVICON
        if(event.channel === 'favicon') {
            Tabs.update(template.data._id, {$set:{
                icon: arg
            }});
        }

        // stop here, if browser
        if(template.data._id === 'browser')
            return;

        if(event.channel === 'setBadge') {
            Tabs.update(template.data._id, {$set:{
                badge: arg
            }});
        }

        if(event.channel === 'menuChanges' && arg instanceof Array) {
            arg.forEach(function(arg){

                if(arg.action === 'addMenu') {
                    // filter ID
                    if(arg.entry && arg.entry.id)
                        arg.entry.id = filterId(arg.entry.id);
                    
                    var query = {'$set': {}};

                    if(arg.entry.id)
                        query['$set']['menu.'+ arg.entry.id +'.id'] = arg.entry.id;
                    query['$set']['menu.'+ arg.entry.id +'.selected'] = arg.entry.selected;

                    if(!_.isUndefined(arg.entry.position))
                        query['$set']['menu.'+ arg.entry.id +'.position'] = arg.entry.position;
                    if(!_.isUndefined(arg.entry.name))
                        query['$set']['menu.'+ arg.entry.id +'.name'] = arg.entry.name;
                    if(!_.isUndefined(arg.entry.badge))
                        query['$set']['menu.'+ arg.entry.id +'.badge'] = arg.entry.badge;

                    Tabs.update(template.data._id, query);
                }

                if(arg.action === 'removeMenu') {
                    var query = {'$unset': {}};

                    query['$unset']['menu.'+ arg.id] = '';

                    Tabs.update(template.data._id, query);
                }

                if(arg.action === 'clearMenu') {
                    Tabs.update(template.data._id, {$set: {menu: {}}});
                }
            });
        }

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
        var tab = Tabs.findOne(this._id, {fields: {url: 1, redirect: 1}});
        
        if(tab) {
            // set url only once
            if(tab.redirect) {
                template.url = tab.redirect;
                Tabs.update(this._id, {$unset: {
                    redirect: ''
                }, $set: {
                    url: template.url
                }});
            } else if(!template.url)
                template.url = tab.url;

            return Helpers.formatUrl(template.url);
        }
    }
});