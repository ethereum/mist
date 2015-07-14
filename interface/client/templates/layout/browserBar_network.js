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
    Return the number current block

    @method block
    @return {String}
    */
    'block': function(){
        return Blocks.latest;
    }
});
