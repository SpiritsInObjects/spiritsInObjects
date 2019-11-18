#!/bin/bash

mkdir -p ./releases
mkdir -p ./releases/mac
#--icon=assets/icons/icon.icns
./node_modules/.bin/electron-packager . --overwrite --platform=darwin --arch=x64 --prune=true --out=./releases/mac
#build dmg for mac install
sleep 5s
#--icon=assets/icons/icon.icns 
./node_modules/.bin/electron-installer-dmg ./releases/mac/spiritsInObjects.app spiritsInObjects --out=./releases/mac  --overwrite    
# Path to the icon file that will be the app icon in the DMG window.
#  --icon-size=<px>     How big to make the icon for the app in the DMG. [Default: `80`].
#  --background=<path>  Path to a PNG image to use as the background of the DMG.
#--overwrite          Overwrite any existing DMG.
