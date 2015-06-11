#include "./curl.h"

extern "C" {
static void init (Handle<Object> target)
{
    NodeCurl::Init (target);
}

NODE_MODULE (node_curl, init);
}

