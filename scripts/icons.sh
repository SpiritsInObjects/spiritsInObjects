#!/bin/bash

convert -resize x32 -gravity center -crop 32x32+0+0 -flatten -colors 256 ./dist/icons/icon.png ./dist/icons/icon.ico
#./node_modules/.bin/png2icns ./dist/icons/icon.icns ./dist/icons/icon.png
