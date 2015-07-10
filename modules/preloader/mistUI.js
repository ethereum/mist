/**
@module MistUI
*/

const ipc = require('ipc');
const syncMinimongo = require('../syncMinimongo.js');
const remote = require('remote');
const Menu = remote.require('menu');
const MenuItem = remote.require('menu-item');
const web3 = require('web3');
const ipcProviderWrapper = require('../ipc/ipcProviderWrapper.js');
const i18n = require('../i18n.js');

const web3Admin = require('./web3Admin');
web3Admin.extend(web3);

// set web3 providor
web3.setProvider(new web3.providers.IpcProvider('', ipcProviderWrapper));


// make variables globally accessable
window.dirname = __dirname;
window.web3 = web3;
window.syncMinimongo = syncMinimongo;


// set the langauge for the electron interface
// ipc.send('setLanguage', navigator.language.substr(0,2));


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
menu.append(new MenuItem({ label: i18n.t('mist.rightClick.reload'), accelerator: 'Command+R', click: function() {
    var webview = Helpers.getWebview(LocalStore.get('selectedTab'));
    if(webview)
        webview.reloadIgnoringCache();
}}));
menu.append(new MenuItem({ label: i18n.t('mist.rightClick.openDevTools'), click: function() {
    var webview = Helpers.getWebview(LocalStore.get('selectedTab'));
    if(webview)
        webview.openDevTools();
}}));
menu.append(new MenuItem({ label: i18n.t('mist.rightClick.inspectElements'), click: function() {
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


