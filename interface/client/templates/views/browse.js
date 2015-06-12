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
        timeoutId;

    this.find('webview').addEventListener('did-start-loading', function(e){
        console.log('start loading', this.getUrl());
        
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
        Session.set('browserQuery', e.url);
    });
});

Template['views_browse'].helpers({
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