
Template['layout_main'].onRendered(function(){
	ipc.on('mistUI_enableSecurityOverlay', function(e, value) {
	    $('html').toggleClass('has-security-overlay', !!value);
	});
});