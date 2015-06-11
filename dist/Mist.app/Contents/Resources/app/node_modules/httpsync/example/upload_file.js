/*!
 * httpsync - example/upload_file.js
 *
 * Upload a form data with `https://github.com/felixge/node-form-data`
 * 
 * Copyright(c) 2012 fengmk2 <fengmk2@gmail.com>
 * MIT Licensed
 */

"use strict";

/**
 * Module dependencies.
 */

var FormData = require('form-data');
var path = require('path');
var fs = require('fs');
var httpsync = require('../');

var filepath = path.join(__dirname, 'upload_file.js');

var form = new FormData();
form.append('my_field', 'my value');
form.append('my_buffer', new Buffer(10));
form.append('file', fs.createReadStream(filepath));

var req = httpsync.request({
  url: 'http://localhost:8081/',
  method: 'POST',
  headers: form.getHeaders()
});

form.on('data', function (data) {
  req.write(data);
});

form.on('end', function () {
  req.end();
});