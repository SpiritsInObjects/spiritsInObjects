#!/bin/bash

version=$(jq -r  '.version' ./package.json)

mkdir -p ./releases
mkdir -p ./releases/linux
#package app
#--icon=assets/icons/icon.png
# for json root "icon": "./assets/icons/icon.png",
./node_modules/.bin/electron-packager . spiritsinobjects --overwrite --platform=linux --arch=x64  --prune=true --out=./releases/linux
#build a .deb installer
./node_modules/.bin/electron-installer-debian --src ./releases/linux/spiritsinobjects-linux-x64/ --arch amd64 --config ./scripts/build_linux.json

echo $version