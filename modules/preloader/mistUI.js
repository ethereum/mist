/**
@module preloader MistUI
*/


const ipc = require('ipc');
const syncMinimongo = require('../syncMinimongo.js');
const remote = require('remote');
const Menu = remote.require('menu');
const MenuItem = remote.require('menu-item');
const Web3 = require('web3');
const ipcProviderWrapper = require('../ipc/ipcProviderWrapper.js');
const i18n = require('../i18n.js');
const web3Admin = require('../web3Admin.js');


// make variables globally accessable
window.web3 = new Web3(new Web3.providers.IpcProvider('', ipcProviderWrapper));
web3Admin.extend(window.web3);

window.dirname = __dirname;
window.syncMinimongo = syncMinimongo;
window.ipc = ipc;
window.platform = process.platform;



// set the langauge for the electron interface
// ipc.send('setLanguage', navigator.language.substr(0,2));


// A message will be send to a webview/window
ipc.on('mistUI_windowMessage', function(type, id, error, value) {

    if(type === 'requestAccount' && !error) {
        Tabs.update({webviewId: id}, {$addToSet: {
            'permissions.accounts': value
        }})
    }
});


// Wait for webview toggle
ipc.on('toggleWebviewDevTool', function(id){
    var webview = Helpers.getWebview(id);

    if(!webview)
        return;

    if(webview.isDevToolsOpened())
        webview.closeDevTools();
    else
        webview.openDevTools();
});

// Run tests
ipc.on('runTests', function(type){
    if(type === 'webview') {
        web3.eth.getAccounts(function(error, accounts){
            if(error)
                return;

            // remove one account
            accounts.pop();

            Tabs.upsert('tests', {
                position: -1,
                name: 'Test',
                url: 'file://'+ __dirname + '/../../tests/mocha-in-browser/runner.html',
                permissions: {
                    accounts: accounts
                }
            });

            Tracker.afterFlush(function(){
                LocalStore.set('selectedTab', 'tests');
            });

            // update the permissions, when accounts change
            // Tracker.autorun(function(){
            //     var accounts = _.pluck(EthAccounts.find({}, {fields:{address: 1}}).fetch(), 'address');

            //     // remove one account
            //     accounts.pop();

            //     Tabs.update('tests', {$set: {
            //         'permissions.accounts': accounts
            //     }});
            // });
        });
    }
});



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

