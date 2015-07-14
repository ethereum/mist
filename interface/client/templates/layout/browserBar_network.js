/**
Template Controllers

@module Templates
*/


/**
The browserBar network template

@class [template] layout_browserBar_network
@constructor
*/



Template['layout_browserBar_network'].helpers({
    /**
    Return the number current blockNumber

    @method blockNumber
    @return {String}
    */
    'blockNumber': function(){
        return Block
    }
});
