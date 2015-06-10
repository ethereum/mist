/**
Template Controllers

@module Templates
*/

/**
The tab template

@class [template] elements_tab
@constructor
*/

Template['elements_tab'].onRendered(function(){
    this.find('webview').addEventListener('did-stop-loading', webviewLoadStop);
    this.find('webview').addEventListener('did-get-redirect-request', webviewLoadStart);
});


Template['elements_tab'].helpers({
    /**
    Determines if the current tab is visible

    @method (isVisible)
    */
    'isVisible': function(){
        return (LocalStore.get('selectedTab') === this._id) ? '' : 'hidden';
    }
});