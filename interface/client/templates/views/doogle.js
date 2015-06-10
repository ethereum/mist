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
        var url = Session.get('browser-bar');

        if(!url)
            return 'about:blank';

        // TODO make protocol handling intelligent
        if(url.indexOf('http') === 0)
            return url;
        else
            return 'http://'+ url;
    }
});