#ifndef CURL_H
#define CURL_H

#include <v8.h>
#include <node.h>
#include "../deps/curl/include/curl/curl.h"
#include <vector>
using namespace v8;

// Global object exposed to the world
class NodeCurl : public node::ObjectWrap {
    public:
        static void Init (Handle<Object> target);

        // Public APIs
        static Handle<Value> request (const Arguments&);
        static Handle<Value> get (const Arguments&);
        static Handle<Value> post (const Arguments&);
};

// Request Object
class Request {
    public:
        Request ();
        ~Request ();

        static Handle<Value> New (Handle<Object>);

        // Public APIs
        // request.write(chunk)
        static Handle<Value> write (const Arguments&);
        // request.end([chunk])
        static Handle<Value> end (const Arguments&);
        // request.endFile(filename)
        static Handle<Value> endFile (const Arguments&);

    private:
        // Generate new Rquest Object
        static Handle<ObjectTemplate> NewTemplate ();

        // Translate curl result to Object
        Handle<Object> GetResult () const;

        // Add custom headers
        void AddHeaders (Handle<Object> headers) const;

        // Parse headers to object
        Handle<Object> ParseHeaders () const;

        // Set content-length according to method
        void SetContentLength (size_t) const;

        // Callbacks with curl
        static size_t read_data (void *ptr, size_t size, size_t nmemb, void *userdata);
        static size_t write_data (void *ptr, size_t size, size_t nmemb, void *userdata);

        CURL *curl_;
        typedef std::vector<char> buffer_t;
        buffer_t read_buffer_, write_buffer_, header_buffer_;
        size_t read_pos_;

        enum { METHOD_LEN = 64 };
        char method_[METHOD_LEN];

    protected:
        static inline Request* Unwrap (v8::Handle<v8::Object> handle);
        inline void Wrap (v8::Handle<v8::Object> handle);
};

#define THROW_BAD_ARGS \
    ThrowException(Exception::TypeError(String::New("Bad arguments")))

#define THROW_TYPE_ERROR(msg) \
    ThrowException(Exception::TypeError(String::New(msg)))

#endif /* end of CURL_H */
