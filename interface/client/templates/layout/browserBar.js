/**
Template Controllers

@module Templates
*/

/**
The browserBar template

@class [template] layout_browserBar
@constructor
*/


Template['layout_browserBar'].rendered = function(){

};


Template['layout_browserBar'].helpers({
    /**
    Get the current account

    @method (account)
    */
    'account': function(){
        return Accounts.findOne(this.account);
    }
});

Template['layout_browserBar'].events({
    /*
    Send the domain

    @event submit
    */
    'submit': function(e, template){
        var tabs = Tabs.find().fetch(),
            value = template.find('input').value;

        if(find = _.find(tabs, function(tab){
            return (value.indexOf(tab.url) !== -1);
        })) {

            LocalStore.set('selectedTab', find._id);

        } else {
            
            Session.set('browser-bar', value);

            // switch tab to doogle
            LocalStore.set('selectedTab', 'doogle');
        }
    }
});
