// disable pinch zoom gesture
document.addEventListener('mousewheel', function(e) {
    if(e.deltaY % 1 !== 0) {
        e.preventDefault();
    }
});

$(window).on('blur', function(e){ 
    $('body').addClass('blur');
});
$(window).on('focus', function(e){ 
    $('body').removeClass('blur');
});