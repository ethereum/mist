/**
Template Controllers

@module Templates
*/

/**
The body template

@class [template] body
@constructor
*/

Template.body.helpers({
    /**
    Chooses the view to render at start

    @method renderApp
    */
    'renderApp': function () {
        if (_.isEmpty(location.hash)) {
            $('title').text('Mist');
            return 'layout_main';
        } else {
            var renderWindow = location.hash.match(/#([a-zA-Z]*)_?/);

            if (renderWindow.length > 0) {
                return 'popupWindows_' + renderWindow[1];
            } else {
                return false;
            }
        }
    }
});

/*
Template.body.events({
    /**
    On drag over prevent redirect

    @event dragover body > *, drop body > *
    *
   'dragover body > *, drop body > *': function(e){
        e.preventDefault();
    },
});*/
