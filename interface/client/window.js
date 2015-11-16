
// add the platform to the HTML tag
setTimeout(function(){
    document.getElementsByTagName('html')[0].className =  window.platform;
}, 100);


$(window).on('blur', function(e){ 
    $('body').addClass('app-blur');
});
$(window).on('focus', function(e){ 
    $('body').removeClass('app-blur');
});