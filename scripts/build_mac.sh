#!/bin/bash

version=$(jq -r  '.version' ./package.json)

mkdir -p ./releases
mkdir -p ./releases/mac

#--icon=assets/icons/icon.icns
if [ -f "./appleIdentity" ]; then 
	echo "Building, signing and notarizing application..."
	node ./scripts/build_and_sign_mac.js
else
	echo "Building application..."
	./node_modules/.bin/electron-packager . --overwrite --platform=darwin --ignore=^/proto_imagetosound-nw --arch=x64 --prune=true --out=./releases/mac
fi

#build dmg for mac install
sleep 5s

echo "Building dmg installer..."

#--icon=assets/icons/icon.icns 
./node_modules/.bin/electron-installer-dmg ./releases/mac/spiritsinobjects-darwin-x64/spiritsinobjects.app spiritsinobjects --out=./releases/mac  --overwrite    
# Path to the icon file that will be the app icon in the DMG window.
#  --icon-size=<px>     How big to make the icon for the app in the DMG. [Default: `80`].
#  --background=<path>  Path to a PNG image to use as the background of the DMG.
#--overwrite          Overwrite any existing DMG.

mv ./releases/mac/spiritsinobjects.dmg "./releases/mac/spiritsinobjects_${version}.dmg"

echo "Built installer of version ${version}"