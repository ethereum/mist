/**
Template Controllers

@module Templates
*/

/**
The sidebar template


@class [template] views_browse
@constructor
*/

Template['views_browse'].onRendered(function(){
    var template = this,
        webview = this.find('webview'),
        timeoutId;

    webview.addEventListener('did-start-loading', function(e){
        console.log('start loading', this.getUrl());
        
        TemplateVar.set(template, 'loading', true);

        // timeout spinner after 10s
        // timeoutId = Meteor.setTimeout(function(){
        //     TemplateVar.set(template, 'loading', false);
        // }, 10 * 1000);
    });
    webview.addEventListener('did-stop-loading', function(e){
        // Meteor.clearTimeout(timeoutId);
        TemplateVar.set(template, 'loading', false);
        webviewLoadStop.apply(this, e);
    });
    webview.addEventListener('did-get-redirect-request', webviewLoadStart);
    webview.addEventListener('new-window', function(e){
        Session.set('browserQuery', e.url);
    });

    // IPC communication
    webview.addEventListener('ipc-message', function(event) {
      console.log('IPC:', event.args[0]);
      // Prints "pong"
    });
});

Template['views_browse'].helpers({
    /**
    Determines if the current tab is visible

    @method (isVisible)
    */
    'isVisible': function(){
        return (LocalStore.get('selectedTab') === "browser") ? '' : 'hidden';
    },
    /**
    Return the correct URL

    @method (url)
    */
    'url': function() {
        var url = Session.get('browserQuery');

        if(!url)
            return 'about:blank';

        return Helpers.formatUrl(url);
    }
});