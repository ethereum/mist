/**
Template Controllers

@module Templates
*/

/**
The sidebar template

@class [template] views_doogle
@constructor
*/

Template['views_doogle'].onRendered(function(){
    this.find('webview').addEventListener('did-stop-loading', webviewLoadStop);
    this.find('webview').addEventListener('did-get-redirect-request', webviewLoadStart);
});

Template['views_doogle'].helpers({
    /**
    Return the correct URL

    @method (url)
    */
    'url': function() {
        var url = Session.get('doogleQuery');

        if(!url)
            return 'about:blank';

        return Helpers.formatUrl(url);
    }
});