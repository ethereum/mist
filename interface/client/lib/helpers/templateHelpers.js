/**
Helper functions

@module Helpers
**/

/**
Global template helpers

@class TemplateHelpers
@constructor
**/

/**
A simple template helper to log objects in the console.

@method (debug)
**/
Template.registerHelper('debug', function(object){
    console.log(object);
});

/**
Return the current dirname.

@method (dirname)
**/
Template.registerHelper('dirname', function(identity){
    return window.dirname;
});

/**
Get the current user agent

@method (useragent)
**/
Template.registerHelper('useragent', function(identity){
    return navigator.userAgent;
});

/**
Get all accounts

@method (accounts)
**/
Template.registerHelper('accounts', function(identity){
    return Accounts.find({}, {sort: {name: 1}});
});

/**
Check if the given wallet is a watch only wallet, by checking if we are one of owners in the wallet.

@method (isWatchOnly)
@param {String} id the id of the wallet to check
**/
Template.registerHelper('isWatchOnly', Helpers.isWatchOnly);

/**
Return the right wallet icon

@method (walletIcon)
**/
Template.registerHelper('walletIcon', function(){
    var icon = '';

    if(this.type === 'wallet') {
        if(Helpers.isWatchOnly(this._id))
            icon = '<i class="icon-eye" title="Watch only"></i>';
        else
            icon = '<i class="icon-wallet" title="Wallet"></i>';
    } else if(this.type === 'account')
        icon = '<i class="icon-key" title="Account"></i>';

    return new Spacebars.SafeString(icon);
});


/**
Get the account name or display the address

@method (accountNameOrAddress)
@param {String} address
*/
Template.registerHelper('accountNameOrAddress', function(address){
    if(account = Accounts.findOne({address: address}))
        return account.name;
    else
        return address;
});

/**
Formats a timestamp to any format given.

    {{formatTime myTime "YYYY-MM-DD"}}

@method (formatTime)
@param {String} time         The timstamp, can be string or unix format
@param {String} format       the format string, can also be "iso", to format to ISO string, or "fromnow"
//@param {Boolean} realTime    Whether or not this helper should re-run every 10s
@return {String} The formated time
**/
Template.registerHelper('formatTime', Helpers.formatTime);


/**
Formats a number.

    {{formatNumber myNumber "0,0.0[0000]"}}

@method (formatNumber)
@param {String} number
@param {String} format       the format string
@return {String} The formatted number
**/
Template.registerHelper('formatNumber', Helpers.formatNumber);


/**
Formats a number.

    {{formatBalance myNumber "0,0.0[0000]"}}

@method (formatBalance)
@param {String} number
@param {String} format       the format string
@return {String} The formatted number
**/
Template.registerHelper('formatBalance', Helpers.formatBalance);