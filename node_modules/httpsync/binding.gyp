{
  "targets": [
    {
      "target_name": "node_curl",
      "cflags": ["-g", "-D_FILE_OFFSET_BITS=64", "-D_LARGEFILE_SOURCE", "-Wall"], 
      "sources": [
        "src/main.cc",
        "src/curl.cc",
        "src/request.cc"
      ]
    }
  ]
}