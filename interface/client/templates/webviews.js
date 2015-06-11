


webviewLoadStop = function(e){
    var webview = this;
        url = webview.getUrl(),
        title = webview.getTitle(),
        tabId = $(webview).data('id');
        // tabs = Tabs.find().fetch();

    if(!url || url === 'about:blank' || url === location.toString())
        return;

    console.log('Stop loading ', url);


    // CHECK if url is the current tab, another one or doogle
    // make sure it switched to the correct existing tab, when the main url was changed
    // if((find = _.find(tabs, function(tab){
    //         var tabOrigin = new URL(tab.url).origin;
    //         return (url.indexOf(tabOrigin) !== -1);
    //     }))) {

    //     // stop this action
    //     this.stop();

    //     Tabs.update(tab, {$set: {url: url}});
    //     LocalStore.set('selectedTab', find._id);

    // // switch to doogle, when the url in the tab changed away from 
    // } else if(!_.isEmpty(tabId) &&
    //           !_.find(tabs, function(tab){
    //                 // TODO: shorten the base url out of tab.url
    //                 return (url.indexOf(tab.url) !== -1);
    //             })) {

    //     // stop this action
    //     this.stop();
        
    //     Session.set('doogleQuery', url);

    //     // switch tab to doogle
    //     LocalStore.set('selectedTab', 'doogle');
    // }



    // IS DOOGLE
    if(_.isEmpty(tabId)) {

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
                title: title,
                url: url,
                // icon: '',
                timestamp: moment().unix()
            });

        // ADD to doogle history
        if(find = DoogleHistory.findOne({url: url}))
            DoogleHistory.update(find._id, {$set: {timestamp: moment().unix()}});
        else
            DoogleHistory.insert({
                title: title,
                url: url,
                // icon: '',
                timestamp: moment().unix()
            });

    // IS TAB
    } else {

        // update current tab url
        Tabs.update(tabId, {$set: {url: url}});
    }
};



webviewLoadStart = function(e){
    if(!e.isMainFrame)
        return;

    var tabs = Tabs.find().fetch(),
        tabId = $(this).data('id'),
        url = e.newUrl,
        foundTab = _.find(tabs, function(tab){
            var tabOrigin = new URL(tab.url).origin;
            return (url.indexOf(tabOrigin) !== -1);
        });


    // make sure it switched to the correct existing tab, when the main url was changed
    if(foundTab && foundTab._id !== tabId) {
        console.log('Intercept request, switching to correct tab: '+ foundTab.name + ' -> '+ url);

        // stop this action
        this.stop();

        RedirectTab.set({
            id: foundTab._id,
            url: url
        });
        LocalStore.set('selectedTab', foundTab._id);

    // switch to doogle, when the url in the tab changed away from 
    } else {// if(!_.isEmpty(tabId) && !foundTab) {
        console.log('Intercept request, switching to doogle: '+ url);

        // stop this action
        this.stop();
        
        Session.set('doogleQuery', url);

        // switch tab to doogle
        LocalStore.set('selectedTab', 'doogle');
    }
};