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
        Tabs.update(template.data._id, {$set: {url: e.url}});
    });


    // MIST API
    webview.addEventListener('ipc-message', function(event) {
        var arg = event.args[0];

        // if(event.channel === 'addMenu') {
        //     var query = {'$set': {}};

        //     query['$set']['menu.'+ arg.id] = {
        //         id: arg.id,
        //         name: arg.name,
        //         badge: arg.badge
        //     };

        //     Tabs.update(template.data._id, query);
        // }

        if(event.channel === 'addMenu') {
            var query = {'$set': {}};

            if(arg.id)
                query['$set']['menu.'+ arg.id +'.id'] = arg.id;
            if(!_.isUndefined(arg.position))
                query['$set']['menu.'+ arg.id +'.position'] = arg.position;
            if(!_.isUndefined(arg.name))
                query['$set']['menu.'+ arg.id +'.name'] = arg.name;
            if(!_.isUndefined(arg.badge))
                query['$set']['menu.'+ arg.id +'.badge'] = arg.badge;

            Tabs.update(template.data._id, query);
        }

        if(event.channel === 'removeMenu') {
            var query = {'$unset': {}};

            query['$unset']['menu.'+ arg] = '';

            Tabs.update(template.data._id, query);
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