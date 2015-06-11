var app = require("http").createServer(function (req, res) {
  if (req.headers.timeout) {
    setTimeout (function () {
      res.end();
    }, 2000);
    return;
  }

  if (req.method === "HEAD") {
    res.writeHead(200, {
      'Content-Type'  : 'text/plain',
      'Date'          : 'Wed, 17 Mar 2004 18 : 00 : 49 GMT',
      'Last-Modified' : 'Wed, 25 Feb 2004 22 : 37 : 23 GMT'
    });
    res.end();
    return;
  }

  if (req.headers.customheaders) {
    res.writeHead(42, {
      'Content-Type': 'text/plain',
      'customheaders': req.headers.customheaders
    });
  } else {
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'X-REQUEST-URL': req.url,
      'X-REQUEST-METHOD': req.method
    });
  }

  if (!req.headers.nomethod) {
    res.write(req.method + "\n");
  }

  if (req.headers.custom) {
    res.write(JSON.stringify(req.headers));
  }

  var data = new Buffer("");
  req.on("data", function (chunk) {
    data += chunk;
  });
  req.on("end", function (chunk) {
    res.end(data);
  });
});

app.listen(0, function () {
  console.log('%j', app.address());
});

setTimeout(function () {
  process.exit();
}, 10000);