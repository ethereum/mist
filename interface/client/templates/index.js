/**
Template Controllers

@module Templates
*/

/**
The body template

@class [template] body
@constructor
*/

// Generic windows reuse windows by switching the template
ipc.on('uiAction_switchTemplate', (e, templateName) => {
    TemplateVar.setTo('#generic-body', 'MainRenderTemplate', `popupWindows_${templateName}`);
});

Template.body.helpers({
    /**
    Chooses the view to render at start

    @method renderApp
    */
    'renderApp': function () {
        // Generic windows return the TemplateVar if set in the ipc call above
        const template = TemplateVar.get('MainRenderTemplate');
        if (template) { return template; }

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
