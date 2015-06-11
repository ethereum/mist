#include "./curl.h"

void NodeCurl::Init(Handle<Object> target) {
  target->Set(String::NewSymbol("request"),
    FunctionTemplate::New(request)->GetFunction());
  target->Set(String::NewSymbol("get"),
    FunctionTemplate::New(get)->GetFunction());
}

// curl.request (options);
Handle<Value> NodeCurl::request(const Arguments& args) {
  HandleScope scope;

  if (args.Length() != 1 || !args[0]->IsObject()) {
    return THROW_BAD_ARGS;
  }

  return Request::New(Handle<Object>::Cast(args[0]));
}

// curl.get (options | url);
Handle<Value> NodeCurl::get (const Arguments& args) {
  HandleScope scope;

  if (args.Length() != 1 || (!args[0]->IsObject() && !args[0]->IsString())) {
    return THROW_BAD_ARGS;
  }

  Handle<Object> options = Object::New();
  if (args[0]->IsString()) {
    options->Set(String::NewSymbol("url"), args[0]);
    options->Set(String::NewSymbol("method"), String::New("GET"));
  } else {
    options = Handle<Object>::Cast(args[0]);
    options->Set(String::NewSymbol("method"), String::New("GET"));
  }

  return Request::New (options);
}

