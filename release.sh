#!/bin/bash


mkdir -p ~/wanwallet_release
gulp --wallet 
cp /home/lzhang/wanchain/wanwallet/dist_wallet/release/* ~/wanwallet_release 
gulp --wallet  --internal
cp /home/lzhang/wanchain/wanwallet/dist_wallet/release/* ~/wanwallet_release 
