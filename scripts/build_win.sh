#!/bin/bash

mkdir -p ./releases
mkdir -p ./releases/win

./node_modules/.bin/electron-packager . spiritsInObjects --overwrite --platform=win32 --arch=x64 --icon=assets/icons/icon.ico --prune=true --out=./releases/win --version-string.CompanyName="dartmouth.edu" --version-string.FileDescription="Application for image sonification and sequencing" --version-string.ProductName="spiritsInObjects"

node ./scripts/build_win.js
