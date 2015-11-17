const protocol = require('protocol');



protocol.registerHttpProtocol('eth', function(request, callback) {

    // callback({mimeType: 'text/html', data: new Buffer('<h5>Response</h5>')});
    var call = {
        url: 'http://localhost:3050/' + request.url.replace('eth://',''),
        method: request.method,
        referrer: request.referrer
    };

    // console.log(call);

    callback(call);

}, function (error) {
  if (error)
    console.error('Failed to register protocol')
});


// protocol.registerProtocol('eth', function(request) {
//     var url = request.url.substr(7)
//     return new protocol.RequestStringJob({data: 'Hello'});
// });

// protocol.registerProtocol('bzz', function(request) {
//     var url = request.url.substr(7)
//     return new protocol.RequestStringJob({data: 'Hello'});
// });


protocol.registerStandardSchemes(['eth', 'bzz']); //'eth', 'bzz'