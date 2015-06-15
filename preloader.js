const ipc = require('ipc');

// Wait for webview toogle
ipc.on('toogleWebviewDevTool', function(id){
    var webview = (id === 'browser') ? $('webview#browser-view')[0] : $('webview[data-id="'+ id +'"]')[0];

    if(!webview)
        return;

    if(webview.isDevToolsOpened())
        webview.closeDevTools();
    else
        webview.openDevTools();
});


/**
Update the main appliction menu with a toogle for all webview devtools.

*/
var updateApplicationMenuDevTools = function(webviews){
    var returnWebviews = [];

    if(webviews) {
        webviews.each(function(){
            $webview = $(this);

            returnWebviews.push({
                name: (!$webview.data('id')) ? 'the browser' : $webview.attr('src'),
                id: $webview.data('id') || 'browser'
            });
        });
    }
    ipc.send('setupWebviewDevToolsMenu', returnWebviews);
};

window.updateApplicationMenuDevTools = updateApplicationMenuDevTools;