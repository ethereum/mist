/**
Template Controllers

@module Templates
*/


/**
The tab template

@class [template] views_tab
@constructor
*/

Template['views_tab'].onRendered(function(){
    var template = this,
        webview = this.find('webview'),
        timeoutId;

    // Send updated TEST DATA
    if(template.data._id === 'tests') {
        this.autorun(function(c){
            var tab = Tabs.findOne('tests');

            if(!c.firstRun)
                webview.send('sendData', tab);

            // ADD SWITCHUNG USING webview.loadURL();
        });
    }

    ipc.on('uiAction_reloadSelectedTab', function(e) {
        console.log('uiAction_reloadSelectedTab', LocalStore.get('selectedTab'));
        if(LocalStore.get('selectedTab') === this._id){
            var webview = Helpers.getWebview(LocalStore.get('selectedTab'));
            console.log(webview);
            webview.reload();        
        }
    });

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
    webview.addEventListener('ipc-message', mistAPIBackend.bind({
        template: template,
        webview: webview
    }));
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