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
        tabId = template.data._id,
        webview = this.find('webview');

    // Send updated TEST DATA
    if(tabId === 'tests') {
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
    webview.addEventListener('did-stop-loading', function(e){
        TemplateVar.set(template, 'loading', false);
    });
    
    // change url
    webview.addEventListener('did-navigate', webviewChangeUrl.bind(webview, tabId));
    webview.addEventListener('did-navigate-in-page', webviewChangeUrl.bind(webview, tabId));
    webview.addEventListener('did-get-redirect-request', webviewChangeUrl.bind(webview, tabId));
    webview.addEventListener('did-stop-loading', webviewChangeUrl.bind(webview, tabId));

    // set page history
    webview.addEventListener('dom-ready', function(e){

        var titleFull = this.getTitle(),
            title = titleFull;

        if(titleFull && titleFull.length > 40) {
            title = titleFull.substr(0, 40);
            title += '…';
        }

        // update the title
        Tabs.update(tabId, {$set: {
            name: title,
            nameFull: titleFull
        }});

        webviewLoadStop.call(this, tabId, e);
    });

    // navigate page, and redirect to browser tab if necessary
    webview.addEventListener('will-navigate', webviewLoadStart.bind(webview, tabId));
    webview.addEventListener('did-get-redirect-request', webviewLoadStart.bind(webview, tabId));
    webview.addEventListener('new-window', webviewLoadStart.bind(webview, tabId));


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
        var tab = Tabs.findOne(this._id, {fields: {redirect: 1}});

        if(tab) {

            // set url only once
            if(tab.redirect) {
                template.url = tab.redirect;
            }

            // remove redirect
            Tabs.update(this._id, {$unset: {
                redirect: ''
            }, $set: {
                url: template.url
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