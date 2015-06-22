
// set browser as default tab
if(!LocalStore.get('selectedTab'))
    LocalStore.set('selectedTab', 'browser');

if(!Tabs.findOne('browser'))
    Tabs.insert({
        _id: 'browser',
        url: 'about:blank',
        position: 0
    });