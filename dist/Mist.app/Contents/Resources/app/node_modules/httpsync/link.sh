node-gyp rebuild

SYSTEM=`uname -s`
EXTRA_FLAG="";
if [ $SYSTEM = "Darwin" ] ; then 
  # for mac    
  EXTRA_FLAG="-flat_namespace -undefined suppress"
  echo 'building for mac'
fi

gcc -o build/Release/node_curl.node build/Release/obj.target/node_curl/src/curl.o \
  build/Release/obj.target/node_curl/src/main.o \
  build/Release/obj.target/node_curl/src/request.o \
  "deps/curl/lib/.libs/libcurl.a" -shared $EXTRA_FLAG