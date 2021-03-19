#!/bin/bash

version=$(jq -r  '.version' ./package.json)

mkdir -p ./releases
mkdir -p ./releases/mac
mkdir -p ./build

rm -rf ./build/dist

cp -r ./dist ./build/
cp ./package*.json ./build/

cd build
npm i

echo "Building application..."
#--icon=assets/icons/icon.icns
../node_modules/.bin/electron-packager . --overwrite --platform=darwin --arch=x64 --prune=true --out=../releases/mac
#build dmg for mac install
sleep 5s
echo "Building dmg installer..."
#--icon=assets/icons/icon.icns 
../node_modules/.bin/electron-installer-dmg ../releases/mac/spiritsinobjects-darwin-x64/spiritsinobjects.app spiritsinobjects --out=../releases/mac  --overwrite    
# Path to the icon file that will be the app icon in the DMG window.
#  --icon-size=<px>     How big to make the icon for the app in the DMG. [Default: `80`].
#  --background=<path>  Path to a PNG image to use as the background of the DMG.
#--overwrite          Overwrite any existing DMG.

cd ..

mv ./releases/mac/spiritsinobjects.dmg "./releases/mac/spiritsinobjects_${version}.dmg"
rm -r ./build

echo "Built installer of version ${version}"