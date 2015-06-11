# httpsync

[![Build Status](https://secure.travis-ci.org/fengmk2/node-curl.png)](http://travis-ci.org/fengmk2/node-curl)

`httpsync` is a port of libcurl to node.js. Its interface emulates the
`http` module of node.js. But in contrast to `http` module's asynchronous
functions, node-curl provides the equivalent synchronous APIs.

## Install

* required libcurl: http://curl.haxx.se/libcurl/

```bash
$ npm install httpsync
```

## APIs

### httpsync.request(options)
 
 Options:

 - `url`             (required) The url to GET/POST, such as "http://host:80/index.php", just like what you input in the browser.
 - `method`          `GET`, `POST` or `HEAD` or any other valid request. And even `FUCK` if your server supports it.
 - `headers`         Custom headers to be sent. 
 - `useragent`       The User Agent string
 - `timeout`         Maximum time in seconds that you allow the libcurl transfer operation to take.
 - `connectTimeout`  Maximum time in seconds that you allow the connection to the server to take.
 - `debug`           `httpsync` will print debug informations is set to true

 Example

```javascript
var httpsync = require('httpsync');
var req = httpsync.request({
  url: "http://cnodejs.org",
  method: "GET",
  useragent: "Ultimate Web Browser",
  headers: {
    Tag: "TGB3123",
    String: "A long string"
  }
});
```

### httpsync.get([options | url])

 It's equivalent to `curl.request` but the method is default to `GET`.

 And you can have

```javascript
var httpsync = require('httpsync');
var req = httpsync.get({ url : "http://cnodejs.org"});
var res = req.end();
console.log(res);
```

 Or just straight forward

```javascript
var httpsync = require('httpsync');
var req = httpsync.get("http://cnodejs.org");
```

### request.write(chunk)
 
 Write a chunk of data to the request. The type of data can be String or Buffer.

### request.end([chunk])

 Send the request and get response.

 Example

```javascript
var req = curl.request({
  url: "http://cnodejs.org",
  method: "POST"
});
req.write("Some text\n");
req.write("another text");
console.log(req.end());
```

### request.endFile(filePath)

 Send a file directly. The method will default to `PUT`.

 Example

```javascript
var req = curl.request({
  url: "http://cnodejs.org",
});
req.endFile("/etc/passwd");
```

### response

 The response Object is what you get after req.end (), it has following
 fields:

 - `data`        A Buffer that stores data sent by server.
 - `headers`     Complete response headers, even contains those custom ones.
 - `ip`          IP address of the server.
 - `statusCode`  Status code that sent by server.

## Contributors

Thanks goes to the people who have contributed code to this module, see the [GitHub Contributors page](https://github.com/fengmk2/node-curl/graphs/contributors).

Below is the output from `git-summary`

```
 project: node-curl
 commits: 33
 active : 8 days
 files  : 24
 authors: 
    21  赵成                  63.6%
    12  fengmk2                 36.4%
```

## License 

(The MIT License)

Copyright (c) 2012 fengmk2 &lt;fengmk2@gmail.com&gt;
Copyright (c) 2012 zcbenz https://github.com/zcbenz

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
