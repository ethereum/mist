const protocol = require('protocol');


protocol.registerStandardSchemes(['eth', 'bzz']); //'eth', 'bzz'


// protocol.registerProtocol('eth', function(request) {
//     var url = request.url.substr(7)
//     return new protocol.RequestStringJob({data: 'Hello'});
// });

// protocol.registerProtocol('bzz', function(request) {
//     var url = request.url.substr(7)
//     return new protocol.RequestStringJob({data: 'Hello'});
// });