#include "./curl.h"
#include <iostream>
#include <string>
#include <utility>
#include <algorithm>
#include <string.h>
#include <stdio.h>
#include <errno.h>

#include <sys/types.h>
#include <sys/stat.h>
#include <unistd.h>

#include <node_buffer.h>

#define THROW_REQUEST_ALREADY_SEND \
    ThrowException(Exception::Error(String::New("Request is already sent")))

Request::Request ()
    : curl_ (curl_easy_init ()),
      read_pos_ (0)
{
    method_[0] = 0;

    curl_easy_setopt (curl_, CURLOPT_WRITEFUNCTION, write_data);
    curl_easy_setopt (curl_, CURLOPT_WRITEDATA, &write_buffer_);
    curl_easy_setopt (curl_, CURLOPT_HEADERDATA, &header_buffer_);
    curl_easy_setopt (curl_, CURLOPT_NOSIGNAL, 1);
}

Request::~Request () {
    if (curl_) curl_easy_cleanup (curl_);
}

Handle<Value> Request::New (Handle<Object> options) {
    HandleScope scope;

    Handle<Object> handle (NewTemplate ()->NewInstance ());
    Request *request = new Request ();
    request->Wrap (handle);

    // Set options
    Handle<Value> url    = options->Get (String::New ("url"));
    
    // options.url
    curl_easy_setopt (request->curl_, CURLOPT_URL, *String::Utf8Value (url));
    // options.method
    if (options->Has (String::New ("method"))) {
        String::AsciiValue method (options->Get (String::New ("method")));
        strncpy (request->method_, *method, Request::METHOD_LEN);

        if (!strcasecmp ("POST", *method)) {
            curl_easy_setopt (request->curl_, CURLOPT_POST, 1);
        } else if (!strcasecmp ("GET", *method)) {
            curl_easy_setopt (request->curl_, CURLOPT_HTTPGET, 1);
        } else if (!strcasecmp ("HEAD", *method)) {
            curl_easy_setopt (request->curl_, CURLOPT_NOBODY, 1);
        } else if (!strcasecmp ("PUT", *method)) {
            curl_easy_setopt (request->curl_, CURLOPT_UPLOAD, 1);
        } else {
            curl_easy_setopt (request->curl_, CURLOPT_CUSTOMREQUEST, *method);
        }
    }
    // options.useragent
    if (options->Has (String::New ("useragent"))) {
        curl_easy_setopt (request->curl_, CURLOPT_USERAGENT,
              *String::AsciiValue (options->Get (String::New ("useragent"))));
    } else {
        curl_easy_setopt (request->curl_, CURLOPT_USERAGENT, "zcbenz/node-curl");
    }
    // options.debug
    if (options->Get (String::New ("debug"))->BooleanValue ()) {
        curl_easy_setopt (request->curl_, CURLOPT_VERBOSE, true);
    }
    // options.headers
    if (options->Has (String::New ("headers"))) {
        Handle<Value> headers = options->Get (String::New ("headers"));
        if (!headers->IsObject ())
            return THROW_BAD_ARGS;

        request->AddHeaders (Handle<Object>::Cast (headers));
    }
    // options.timeout
    if (options->Has (String::New ("timeout"))) {
        long timeout = options->Get (String::New ("timeout"))->IntegerValue ();
        curl_easy_setopt (request->curl_, CURLOPT_TIMEOUT, timeout);
    }
    // options.connectTimeout
    if (options->Has (String::New ("connectTimeout"))) {
        long timeout = options->Get (String::New ("connectTimeout"))->IntegerValue ();
        curl_easy_setopt (request->curl_, CURLOPT_CONNECTTIMEOUT, timeout);
    }

    return handle;
}

// request.write(chunk)
Handle<Value> Request::write (const Arguments& args) {
    HandleScope scope;

    if (args.Length () != 1)
        return THROW_BAD_ARGS;

    Request *request = Unwrap (args.Holder ());
    if (!request)
        return THROW_REQUEST_ALREADY_SEND;

    if (args[0]->IsString ()) {
        String::Utf8Value chunk (args[0]);
        request->read_buffer_.insert (request->read_buffer_.end (),
                                      *chunk,
                                      *chunk + chunk.length ());
    } else if (args[0]->IsObject ()) {
        Handle<Object> buffer = Handle<Object>::Cast (args[0]);
        char *data  = node::Buffer::Data (buffer);
        size_t length = node::Buffer::Length (buffer);

        request->read_buffer_.insert (request->read_buffer_.end (),
                                      data, data + length);
    } else {
        return THROW_BAD_ARGS;
    }

    return Undefined ();
}

// request.end([chunk])
Handle<Value> Request::end (const Arguments& args) {
    HandleScope scope;

    if (args.Length () > 1)
        return THROW_BAD_ARGS;

    // Have chunk
    if (args.Length () == 1) {
        if (!args[0]->IsString () && !args[0]->IsObject ())
            return THROW_BAD_ARGS;

        Request::write (args);
    }

    Request *request = Unwrap (args.Holder ());
    if (!request)
        return THROW_REQUEST_ALREADY_SEND;

    // Must set file size
    request->SetContentLength (request->read_buffer_.size ());
    // Set read functions
    curl_easy_setopt (request->curl_, CURLOPT_READFUNCTION, read_data);
    curl_easy_setopt (request->curl_, CURLOPT_READDATA, request);

    // Send them all!
    CURLcode res = curl_easy_perform (request->curl_);
    if (CURLE_OK != res) {
        return ThrowException (Exception::Error (
                    String::New (curl_easy_strerror (res))));
    }

    Handle<Object> result = request->GetResult ();

    // Request object is done now;
    delete request;
    args.Holder()->SetPointerInInternalField (0, NULL);

    return scope.Close (result);
}

// request.endFile(filename)
Handle<Value> Request::endFile (const Arguments& args) {
    HandleScope scope;

    if (args.Length () != 1 && !args[0]->IsString ())
        return THROW_BAD_ARGS;

    Request *request = Unwrap (args.Holder ());
    if (!request)
        return THROW_REQUEST_ALREADY_SEND;

    // Prepare file
    String::Utf8Value path(args[0]);
    struct stat buf;
    if (stat (*path, &buf) == -1)
        return ThrowException(Exception::Error(String::New(strerror (errno))));

    FILE *file = fopen (*path, "r");
    if (!file) 
        return ThrowException(Exception::Error(String::New(strerror (errno))));
    curl_easy_setopt (request->curl_, CURLOPT_READDATA, file);

    // method is default to `PUT`
    if (0 == *request->method_) {
        strcpy (request->method_, "PUT");
        curl_easy_setopt (request->curl_, CURLOPT_UPLOAD, 1);
    }

    // Must set file size
    request->SetContentLength (buf.st_size);

    // Send them all!
    CURLcode res = curl_easy_perform (request->curl_);
    if (CURLE_OK != res) {
        return ThrowException (Exception::Error (
                    String::New (curl_easy_strerror (res))));
    }

    Handle<Object> result = request->GetResult ();

    fclose (file);

    // Request object is done now;
    delete request;
    args.Holder()->SetPointerInInternalField (0, NULL);

    return scope.Close (result);
}

Handle<ObjectTemplate> Request::NewTemplate () {
    HandleScope scope;

    Handle<ObjectTemplate> tpl = ObjectTemplate::New ();
    tpl->SetInternalFieldCount (1);
    NODE_SET_METHOD (tpl , "write"   , Request::write);
    NODE_SET_METHOD (tpl , "end"     , Request::end);
    NODE_SET_METHOD (tpl , "endFile" , Request::endFile);

    return scope.Close (tpl);
}

Handle<Object> Request::GetResult () const {
    HandleScope scope;

    long statusCode;
    curl_easy_getinfo (curl_, CURLINFO_RESPONSE_CODE, &statusCode);
    const char *ip;
    curl_easy_getinfo (curl_, CURLINFO_PRIMARY_IP, &ip);

    Handle<Object> result = Object::New ();
    result->Set (String::NewSymbol ("statusCode"), Integer::New (statusCode));
    result->Set (String::NewSymbol ("ip"), String::New (ip));
    result->Set (String::NewSymbol ("headers"), ParseHeaders ());

    // Set data as Buffer
    result->Set (String::NewSymbol ("data"), node::Buffer::New (
                &write_buffer_[0], write_buffer_.size ())->handle_);

    return scope.Close (result);
}

void Request::AddHeaders (Handle<Object> headers) const {
    HandleScope scope;

    Local<Array> keys = headers->GetPropertyNames ();

    struct curl_slist *list = NULL;
    for (size_t i = 0; i< keys->Length (); ++i) {
        char line[512];

        Local<Value> key   = keys->Get (i);
        Local<Value> value = headers->Get (key);
        snprintf (line, 512, "%s: %s", *String::AsciiValue (key),
                                       *String::AsciiValue (value));

        list = curl_slist_append (list, line);
    }

    curl_easy_setopt (curl_, CURLOPT_HTTPHEADER, list);
}

Handle<Object> Request::ParseHeaders () const {
    HandleScope scope;
    Handle<Object> headers = Object::New ();

    buffer_t::const_iterator end = header_buffer_.end ();
    // Skip first line
    buffer_t::const_iterator it = header_buffer_.begin ();
    while (*it != '\n' && it < end) ++it;
    ++it;

    while (it < end) {
        // Find `:`
        buffer_t::const_iterator tail = it;
        while (*tail != ':' && tail < end) ++tail;

        std::string key (it, tail);
        if (key == "\r\n") break;

        // toLowercase
        std::transform (key.begin(), key.end(), key.begin(), ::tolower);

        // Find `\n`
        it = tail;
        while (*it != '\r' && it < end) ++it;
        ++tail;
        while (*tail == ' ' && tail < it) ++tail;

        std::string value (tail, it);

        headers->Set (String::New (key.c_str (), key.size ()),
                      String::New (value.c_str (), value.size ()));

        std::advance (it, 2);
    }

    return scope.Close (headers);
}

void Request::SetContentLength (size_t size) const {
    if (!strcasecmp (method_, "PUT")) {
        curl_easy_setopt (curl_, CURLOPT_INFILESIZE_LARGE,
                static_cast<curl_off_t> (size));
    } else {
        curl_easy_setopt (curl_, CURLOPT_POSTFIELDSIZE, size);
    }
}

size_t Request::read_data (void *ptr, size_t size, size_t nmemb, void *userdata) {
    Request *request = static_cast<Request*> (userdata);

    // How many data to write
    size_t need = size * nmemb;
    size_t leaved = request->read_buffer_.size () - request->read_pos_;
    size_t to_write = std::min (need, leaved);

    if (to_write == 0) {
        return 0;
    }

    // Copy data
    memcpy(ptr, &(request->read_buffer_[request->read_pos_]), to_write);
    request->read_pos_ += to_write;

    return to_write;
}

size_t Request::write_data (void *ptr, size_t size, size_t nmemb, void *userdata) {
    buffer_t *buffer = static_cast<buffer_t*> (userdata);

    // Copy data to buffer
    char *comein = static_cast<char*> (ptr);
    buffer->insert (buffer->end (), comein, comein + size * nmemb);

    return size * nmemb;
}

Request* Request::Unwrap (v8::Handle<v8::Object> handle) {
    return static_cast<Request*>(handle->GetPointerFromInternalField(0));
}

void Request::Wrap (v8::Handle<v8::Object> handle) {
    handle->SetPointerInInternalField(0, this);
}
