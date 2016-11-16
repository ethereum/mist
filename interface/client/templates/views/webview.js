/**
Template Controllers

@module Templates
*/


/**
The tab template

@class [template] views_webview
@constructor
*/

Template['views_webview'].onRendered(function(){
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
            webview.reload();        
        }
    });

    webview.addEventListener('did-start-loading', function(e){
        TemplateVar.set(template, 'loading', true);
    });
    webview.addEventListener('did-frame-finish-load', function(e){
        var url = Helpers.sanitizeUrl(webview.getURL());

        // make sure to not store error pages
        if(!url || url.indexOf('mist/errorPages/') !== -1)
            return;

        // update the url
        Tabs.update(template.data._id, {$set: {
            url: url
        }});
    });
    webview.addEventListener('did-stop-loading', function(e){
        TemplateVar.set(template, 'loading', false);

        var url = Helpers.sanitizeUrl(webview.getURL());

        // make sure to not store error pages in history
        if(!url || url.indexOf('mist/errorPages/') !== -1)
            return;

        var titleFull = webview.getTitle(),
            title = titleFull;

        if(titleFull && titleFull.length > 40) {
            title = titleFull.substr(0, 40);
            title += '...';
        }

        // update the title
        Tabs.update(template.data._id, {$set: {
            name: title,
            nameFull: titleFull
        }});

        webviewLoadStop.call(this, e);
    });
    webview.addEventListener('did-get-redirect-request', webviewLoadStart);
    webview.addEventListener('new-window', webviewLoadStart);


    // MIST API for installed tabs/dapps
    webview.addEventListener('ipc-message', mistAPIBackend.bind({
        template: template,
        webview: webview
    }));
});

Template['views_webview'].helpers({
    /**
    Determines if the current tab is visible

    @method (isVisible)
    */
    'isVisible': function(){
        return (LocalStore.get('selectedTab') === this._id) ? '' : 'hidden';
    },
    /**
    Gets the current url

    @method (checkedUrl)
    */
    'checkedUrl': function(){
        var template = Template.instance();
        var tab = Tabs.findOne(this._id, {fields: {url: 1, redirect: 1}});

        if(tab) {

            // set url only once
            if(tab.redirect) {
                template.url = tab.redirect;
            } else if(!template.url) {
                template.url = tab.url;
            }

            // remove redirect
            Tabs.update(this._id, {$unset: {
                redirect: ''
            }, $set: {
                // url: template.url
            }});

            // CHECK URL and throw error if not allowed
            if(!Helpers.sanitizeUrl(template.url, true)) {
                console.log('Not allowed URL: '+ template.url);
                return 'file://'+ dirname + '/errorPages/400.html?'+ template.url;
            }
            
            return Helpers.formatUrl(template.url);
        }
    }
});