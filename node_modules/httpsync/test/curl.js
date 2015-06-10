/*!
 * httpsync - node-curl.node test
 * Copyright(c) 2012 fengmk2 <fengmk2@gmail.com>
 * MIT Licensed
 */

"use strict";

/**
 * Module dependencies.
 */

var httpsync = require('../');
var should = require('should');
var spawn = require('child_process').spawn;

describe('curl.js', function () {

  var homeurl = 'http://127.0.0.1:';
  var echoProcess;
  before(function (done) {
    var echofile = __dirname + '/support/echo.js';
    echoProcess = spawn('node', [echofile]);
    echoProcess.stdout.once('data', function (data) {
      data = JSON.parse(data);
      homeurl += data.port;
      done();
    });
  });
  after(function () {
    echoProcess.kill();
  });

  describe('request()', function () {
    it('should throw error', function () {
      (function () {
        var req = httpsync.request();
      }).should.throw('Bad arguments');
      (function () {
        var req = httpsync.request(1, 2);
      }).should.throw('Bad arguments');
      (function () {
        var req = httpsync.request(1);
      }).should.throw('Bad arguments');
      (function () {
        var req = httpsync.request('foo');
      }).should.throw('Bad arguments');
      (function () {
        var req = httpsync.request({});
        req.end();
      }).should.throw('Couldn\'t resolve host name');
      (function () {
        var req = httpsync.request({
          url: 'http://www.notExistsHostName.com/'
        });
        req.end();
      }).should.throw('Couldn\'t resolve host name');
    });

    it('should GET / return status 200', function () {
      var req = httpsync.request({
        url: homeurl
      });
      var res = req.end();
      res.should.header('x-request-url', '/');
      res.should.header('content-type', 'text/plain');
      res.should.status(200);
      res.data.should.be.instanceof(Buffer);
      res.data.toString().should.equal('GET\n');
    });

    it('should ignore data when GET with some data', function () {
      var req = httpsync.request({
        url: homeurl,
        method: 'GET'
      });
      var res = req.end('some data');
      res.should.header('x-request-url', '/');
      res.should.header('content-type', 'text/plain');
      res.should.status(200);
      res.data.toString().should.equal('GET\n');
    });
    it('should POST with empty data', function () {
      var req = httpsync.request({
        url: homeurl + '/post',
        method: 'post'
      });
      var res = req.end();
      res.should.header('x-request-url', '/post');
      res.should.header('content-type', 'text/plain');
      res.should.status(200);
      res.data.toString().should.equal('POST\n');
    });
    it('should return data when POST with some data', function () {
      var req = httpsync.request({
        url: homeurl + '/post',
        method: 'post'
      });
      req.write ("1 line\n");
      req.write ("2 line\n");
      req.write ("3 line\n");
      var res = req.end ("helloworld");
      res.data.toString().should.equal("POST\n1 line\n2 line\n3 line\nhelloworld");
      res.should.header('x-request-url', '/post');
      res.should.header('content-type', 'text/plain');
      res.should.status(200);
    });
    it('should POST with many data', function () {
      var req = httpsync.request({
        url: homeurl + '/pOst',
        method: 'pOst'
      });
      var res = req.end('some data');
      res.should.header('x-request-url', '/pOst');
      res.should.header('content-type', 'text/plain');
      res.should.status(200);
      res.data.toString().should.equal('POST\nsome data');
    });

    it('should HEAD return empty body', function () {
      var req = httpsync.request({
        url: homeurl + '/HEAD',
        method: 'HeAD'
      });
      var res = req.end('some data');
      res.should.header('content-type', 'text/plain');
      res.should.status(200);
      res.data.toString().should.equal('');
    });

    it('should request with other methods', function () {
      var req = httpsync.request({
        url: homeurl + '/put',
        method: 'PUT'
      });
      var res = req.end('put data');
      res.should.header('x-request-url', '/put');
      // res.should.header('content-type', 'text/plain');
      res.should.status(200);
      res.data.toString().should.equal('PUT\nput data');

      var req2 = httpsync.request({
        url: homeurl + '/delete',
        method: 'DELETE'
      });
      var res2 = req2.end('delete DATA');
      res2.should.header('x-request-url', '/delete');
      res2.should.header('content-type', 'text/plain');
      res2.should.status(200);
      res2.data.toString().should.equal('DELETE\n');
    });

    it('should request with custom headers', function () {
      var req1 = httpsync.request({
        url: homeurl,
        headers: {
          "Custom": "true",
          "String": "A very very long string",
          "How": "Old are you"
        }
      });
      var res1 = req1.end ();

      var req2 = httpsync.request({
        url: homeurl,
        method: "DELETE",
        headers: {
          "custom": "true",
          "File": "/etc/passwd",
          "Directory": "/usr"
        }
      });
      var res2 = req2.end();
      var host = homeurl.replace('http://', '');
      res1.data.toString().should.equal("GET\n{\"user-agent\":\"zcbenz/node-curl\",\"host\":\"" +
        host + "\",\"accept\":\"*/*\",\"custom\":\"true\",\"string\":\"A very very long string\",\"how\":\"Old are you\"}");
      res1.should.status(200);
      res2.data.toString().should.equal("DELETE\n{\"user-agent\":\"zcbenz/node-curl\",\"host\":\"" +
        host + "\",\"accept\":\"*/*\",\"custom\":\"true\",\"file\":\"/etc/passwd\",\"directory\":\"/usr\"}");
      res2.should.status(200);
    });

    it('should write with buffer', function () {
      var req = httpsync.request({
        url: homeurl,
        method: "POST",
        headers: { "nomethod": "true" }
      });
      var buf = new Buffer (8);
      buf.writeUInt8(0x3, 0, 'big');
      buf.writeUInt8(0x4, 1, 'big');
      buf.writeUInt8(0x23, 2, 'big');
      buf.writeUInt8(0x42, 3, 'big');
      buf.writeUInt8(0x3, 4, 'little');
      buf.writeUInt8(0x4, 5, 'little');
      buf.writeUInt8(0x23, 6, 'little');
      buf.writeUInt8(0x42, 7, 'little');
      var res = req.end(buf);
      res.data.should.eql(buf);
    });

    it('should endFile() to send file data', function () {
      var req = httpsync.request({
        url: homeurl
      });
      var res = req.endFile(__filename);

      var req2 = httpsync.request({
        url: homeurl,
        method: "POST"
      });
      var res2 = req2.endFile(__filename);
      res.data.toString("utf8").should.equal("PUT\n" + require("fs").readFileSync(__filename));
      res2.data.toString("utf8").should.equal("POST\n" + require("fs").readFileSync(__filename));
    });

    it('should check responded headers', function () {
      var req = httpsync.request ({
        url: homeurl,
        headers: {
          "customheaders": "Test String"
        }
      });
      var res = req.end();
      res.should.header('customheaders', 'Test String');
      res.should.status(42);
    });

    it('should throw err when request with invalid options', function () {
      (function () {
        var req = httpsync.request ({
          url: homeurl,
          headers: {
            "customheaders": "Test String",
          },
          method: 'FUCK'
        });
        var res = req.end();
      }).should.throw('Server returned nothing (no headers, no data)');
    });

    it('should throw timeout', function () {
      (function () {
        var req = httpsync.request ({
          url: homeurl,
          timeout: 1,
          headers: {
            "customheaders": "Test String",
            timeout: 'true'
          },
        });
        var res = req.end();
      }).should.throw('Timeout was reached');
    });
  });

  describe('get()', function () {
    it('should throw error', function () {
      (function () {
        var req = httpsync.get();
      }).should.throw('Bad arguments');
      (function () {
        var req = httpsync.get(1);
      }).should.throw('Bad arguments');
      (function () {
        var req = httpsync.get('foo', {});
      }).should.throw('Bad arguments');
      (function () {
        var req = httpsync.get({});
        req.end();
      }).should.throw('Couldn\'t resolve host name');
      (function () {
        var req = httpsync.get({
          url: 'http://www.notExistsHostName.com/'
        });
        req.end();
      }).should.throw('Couldn\'t resolve host name');
    });

    it('should GET / return status 200 using normal http module', function (done) {
      var info = require('url').parse(homeurl);
      require('http').get({
        host: info.hostname,
        port: info.port,
        path: info.path
      }, function (res) {
        res.should.status(200);
        done();
      });
    });

    it('should GET / return status 200', function () {
      var req = httpsync.get(homeurl);
      var res = req.end();
      res.should.status(200);
    });

    it('should GET with options', function () {
      var req = httpsync.get({
        url: homeurl + '/get'
      });
      var res = req.end();
      res.should.status(200);
      res.should.header('x-request-url', '/get');
      res.should.header('x-request-method', 'GET');
      res.data.toString().should.equal('GET\n');
    });
  });

});
