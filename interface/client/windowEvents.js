
// add the platform to the HTML tag
setTimeout(function(){
    document.getElementsByTagName('html')[0].className =  window.mist.platform;

    if (window.basePathHref) {
        var base = document.createElement('base');

        base.href = window.basePathHref;

        document.getElementsByTagName('head')[0].appendChild(base);      
    }

}, 200);


$(window).on('blur', function(e){ 
    $('body').addClass('app-blur');
});
$(window).on('focus', function(e){ 
    $('body').removeClass('app-blur');
});

// make sure files can only be dropped in the browser webview
$(window).on('dragenter', function(e) {
    LocalStore.set('selectedTab', 'browser');
    ipc.send('backendAction_focusMainWindow');
});