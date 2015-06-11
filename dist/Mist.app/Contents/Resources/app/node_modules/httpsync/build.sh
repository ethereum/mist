mkdir -p deps
cd deps
rm -rf curl
curl -o curl-7.34.0.tar.gz http://curl.haxx.se/download/curl-7.34.0.tar.gz
tar zxf curl-7.34.0.tar.gz
mv curl-7.34.0 curl
cd curl
./configure --without-ssl --disable-shared && make
cd ../..

sh link.sh
