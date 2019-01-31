const { protocol } = require('electron');

protocol.registerHttpProtocol(
  'mist',
  (request, callback) => {
    console.log(
      request.url.indexOf('mist://interface') !== -1
        ? global.interfaceAppUrl + request.url.replace('mist://interface', '')
        : ''
    );

    const call = {
      url:
        request.url.indexOf('mist://interface') !== -1
          ? global.interfaceAppUrl + request.url.replace('mist://interface', '')
          : '',
      method: request.method,
      referrer: request.referrer
    };

    callback(call);
  },
  error => {
    if (error) {
      console.error('Failed to register protocol');
    }
  }
);
