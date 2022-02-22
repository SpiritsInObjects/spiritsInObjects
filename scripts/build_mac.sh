#!/bin/bash

set -e

version=$(jq -r  '.version' ./package.json)

mkdir -p ./releases
mkdir -p ./releases/mac

# remove old build if exists
rm -rf ./releases/mac/spiritsinobjects-darwin-x64

DEBUG=electron-packager

#--icon=assets/icons/icon.icns
if [ -f "./.appleIdentity" ]; then 
	echo "Building, signing and notarizing application..."
	node ./scripts/build_and_sign_mac.js
else
	echo "Building application..."
	./node_modules/.bin/electron-packager . --overwrite --platform=darwin --ignore=^/releases --arch=x64 --prune=true --out=./releases/mac
fi

#build dmg for mac install
sleep 5s

echo "Building dmg installer..."

#--icon=assets/icons/icon.icns 
./node_modules/.bin/electron-installer-dmg ./releases/mac/spiritsInObjects-darwin-x64/spiritsInObjects.app spiritsInObjects --out=./releases/mac --icon=./dist/icons/icon.icns  --overwrite    
# Path to the icon file that will be the app icon in the DMG window.
#  --icon-size=<px>     How big to make the icon for the app in the DMG. [Default: `80`].
#  --background=<path>  Path to a PNG image to use as the background of the DMG.
#--overwrite          Overwrite any existing DMG.

mv ./releases/mac/spiritsInObjects.dmg "./releases/mac/spiritsInObjects_${version}.dmg"

echo "Built installer of version ${version}"