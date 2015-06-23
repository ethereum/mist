/**
Template Controllers

@module Templates
*/

/**
The img template

@class [template] elements_img
@constructor
*/

Template['elements_img'].onRendered(function(){

});


Template['elements_img'].helpers({
    /**
    This helper will preload the image, and then incject it later after its loaded

    @method (preload)
    */
    'preload': function(){
        var template = Template.instance(),
            data = this,
            img = new Image();

        img.onload = function () {
            TemplateVar.set(template, 'src', data.src);
        };
        img.src = data.src;
    }
});