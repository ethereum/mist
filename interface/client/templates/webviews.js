

// fired by "did-stop-loading"
webviewLoadStop = function(e){
    var webview = this,
        url = Helpers.sanitizeUrl(webview.getURL()),
        title = webview.getTitle(),
        tabId = $(webview).data('id');

    if(!url || url === 'about:blank' || url === location.toString())
        return;

    // IS BROWSER
    if(tabId === 'browser') {

        // ADD to doogle last visited pages
        if((find = _.find(DoogleLastVisitedPages.find().fetch(), function(historyEntry){
                if(!historyEntry.url) return;
                var historyEntryOrigin = new URL(historyEntry.url).origin;
                return (url.indexOf(historyEntryOrigin) !== -1);
            })))
            DoogleLastVisitedPages.update(find._id, {$set: {
                timestamp: moment().unix(),
                url: url
            }});
        else
            DoogleLastVisitedPages.insert({
                name: title,
                url: url,
                // icon: '',
                timestamp: moment().unix()
            });

        // ADD to doogle history
        if(find = DoogleHistory.findOne({url: url}))
            DoogleHistory.update(find._id, {$set: {timestamp: moment().unix()}});
        else
            DoogleHistory.insert({
                name: title,
                url: url,
                // icon: '',
                timestamp: moment().unix()
            });

    }

    // update current tab url
    Tabs.update(tabId, {$set: {url: url}});
};


// TODO does this makes sense? use another
// fired by "did-get-redirect-request"
webviewLoadStart = function(e){
    console.log('webviewLoadStart', e, e.isMainFrame);

    if(!e.isMainFrame)
        return;

    var url = Helpers.sanitizeUrl(e.newURL);
    var tabId = Helpers.getTabIdByUrl(url);

    // stop this action
    this.stop();

    Tabs.update(tabId, {$set: {
        url: url,
        redirect: url
    }});
    LocalStore.set('selectedTab', tabId);

};