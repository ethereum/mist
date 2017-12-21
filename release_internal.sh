#!/bin/bash

gulp --wallet --internal
cp /Users/wanchain/astro/jsPro/wanwallet/dist_wallet/release/* /Users/wanchain/Downloads/wanwallet_gui/

rm -rf dist_wallet/
