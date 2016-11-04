

// fired by "did-stop-loading"
webviewLoadStop = function(e){
    var webview = this,
        url = webview.getURL(),
        title = webview.getTitle(),
        tabId = $(webview).data('id');

    if(!url || url === 'about:blank' || url === location.toString())
        return;

    // IS BROWSER
    if(tabId === 'browser') {

        // ADD to doogle last visited pages
        if((find = _.find(DoogleLastVisitedPages.find().fetch(), function(historyEntry){
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

    var tabs = Tabs.find().fetch(),
        tabId = $(this).data('id'),
        url = e.newURL,
        foundTab = _.find(tabs, function(tab){
            var tabOrigin = new URL(tab.url).origin;
            return (url && url.indexOf(tabOrigin) !== -1);
        });


    // make sure it switched to the correct existing tab, when the main url was changed
    if(foundTab)
        foundTab = foundTab._id;
    else
        foundTab = 'browser';

    console.log('Intercept request, switching to correct tab: '+ (foundTab.name || 'Browser') + ' -> '+ url);

    // stop this action
    this.stop();

    Tabs.update(foundTab, {$set: {
        url: url,
        redirect: url
    }});
    LocalStore.set('selectedTab', foundTab);

};