#!/bin/bash

mkdir -p ./docs/code
mkdir -p ./docs/code/sonifyCanvas
mkdir -p ./docs/code/video

./node_modules/.bin/jsdoc2md dist/renderer/lib/sonifyCanvas/index.js > ./docs/code/sonifyCanvas/Readme.md
./node_modules/.bin/jsdoc2md dist/renderer/lib/video/index.js > ./docs/code/video/Readme.md