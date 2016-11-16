

// fired by "did-stop-loading"
webviewLoadStop = function(e){
    var webview = this,
        url = Helpers.sanitizeUrl(webview.getURL()),
        title = webview.getTitle(),
        tabId = $(webview).data('id');

    console.log(e.type, url);

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
};


// fired by "did-get-redirect-request"
// fired by "new-window"
webviewLoadStart = function(e){
    if(e.type !== 'new-window' && !e.isMainFrame)
        return;

    var url = Helpers.sanitizeUrl(e.newURL || e.url);
    var tabId = Helpers.getTabIdByUrl(url);
    var currentTabId = $(this).data('id');

    console.log(e.type, url);

    // if new window (_blank) open in tab, or browser
    if(e.type === 'new-window' && tabId === currentTabId)
        tabId = 'browser';

    // stop this action, as the redirect happens reactive through setting the URL attribute
    this.stop();

    Tabs.update(tabId, {$set: {
        url: url,
        redirect: url
    }});
    LocalStore.set('selectedTab', tabId);

};