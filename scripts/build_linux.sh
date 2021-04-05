#!/bin/bash

version=$(jq -r  '.version' ./package.json)

mkdir -p ./releases
mkdir -p ./releases/linux
mkdir -p ./build

rm -rf ./build/dist

cp -r ./dist ./build/
cp ./package*.json ./build/

cd build
npm i

#package app
#--icon=assets/icons/icon.png
# for json root "icon": "./assets/icons/icon.png",
echo "Building application..."
../node_modules/.bin/electron-packager . spiritsinobjects --overwrite --platform=linux --arch=x64 --ignore=^/proto_imagetosound-nw --prune=true --out=../releases/linux
#build a .deb installer
echo "Creating debian installer..."
../node_modules/.bin/electron-installer-debian --src ../releases/linux/spiritsinobjects-linux-x64/ --arch amd64 --config ../scripts/build_linux.json

cd ..
rm -r ./build

echo "Built installer of version ${version}"