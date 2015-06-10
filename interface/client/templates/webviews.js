


webviewLoadStop = function(e){
    var url = this.getUrl(),
        title = this.getTitle(),
        tabId = $(this).data('id'),
        tabs = Tabs.find().fetch();

    console.log('Stop loading');

    // ADD to doogle history
    if(_.isEmpty(tabId)) {

        // add to history
        if((find = _.find(DoogleHistory.find().fetch(), function(historyEntry){
                // TODO: shorten the base url out of tab.url
                return (url.indexOf(historyEntry.url) !== -1);
            })))
            DoogleHistory.update(find._id, {$set: {timestamp: moment().unix()}});
        else
            DoogleHistory.insert({
                title: title,
                url: url,
                icon: '',
                timestamp: moment().unix()
            });

    // update stored tab URL
    } else {

        // Tabs.update(tabId, {$set: {url: url}});
    }
};



webviewLoadStart = function(e){
    if(!e.isMainFrame)
        return;

    var tabs = Tabs.find().fetch(),
        tabId = $(this).data('id'),
        url = e.newUrl;

    console.log('Start loading to '+ url);

    // make sure it switched to the correct existing tab, when the main url was changed
    if(_.isEmpty(tabId) &&
       (find = _.find(tabs, function(tab){
            // TODO: shorten the base url out of tab.url
            return (url.indexOf(tab.url) !== -1);
        }))) {

        // stop this action
        this.stop();

        Tabs.update(tab, {$set: {url: url}});
        LocalStore.set('selectedTab', find._id);

    // switch to doogle, when the url in the tab changed away from 
    } else if(!_.isEmpty(tabId) &&
              !_.find(tabs, function(tab){
                    // TODO: shorten the base url out of tab.url
                    return (url.indexOf(tab.url) !== -1);
                })) {

        // stop this action
        this.stop();
        
        Session.set('browser-bar', url);

        // switch tab to doogle
        LocalStore.set('selectedTab', 'doogle');
    }
};