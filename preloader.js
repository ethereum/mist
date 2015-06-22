const ipc = require('ipc');
const remote = require('remote');
const Menu = remote.require('menu');
const MenuItem = remote.require('menu-item');

// make variables globally accessable
window.dirname = __dirname;


// Wait for webview toogle
ipc.on('toogleWebviewDevTool', function(id){
    var webview = Helpers.getWebview(id);

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
window.updateApplicationMenuDevTools = function(webviews){
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




// CONTEXT MENU

var currentMousePosition = {x: 0, y: 0};
var menu = new Menu();
// menu.append(new MenuItem({ type: 'separator' }));
menu.append(new MenuItem({ label: 'Reload', accelerator: 'Command+R', click: function() {
    var webview = Helpers.getWebview(LocalStore.get('selectedTab'));
    if(webview)
        webview.reloadIgnoringCache();
}}));
menu.append(new MenuItem({ label: 'Inspect Element', click: function() {
    var webview = Helpers.getWebview(LocalStore.get('selectedTab'));
    if(webview)
        webview.inspectElement(currentMousePosition.x, currentMousePosition.y);
}}));


window.addEventListener('contextmenu', function (e) {
    e.preventDefault();

    // OPEN CONTEXT MENU over webviews
    if($('webview:hover')[0]) {
        currentMousePosition.x = e.layerX;
        currentMousePosition.y = e.layerY;
        menu.popup(remote.getCurrentWindow());
    }
}, false);


document.addEventListener('keydown', function (e) {
    // RELOAD current webview
    if(e.metaKey && e.keyCode === 82) {
        var webview = Helpers.getWebview(LocalStore.get('selectedTab'));
        if(webview)
            webview.reloadIgnoringCache();
    }
}, false);


