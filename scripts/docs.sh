#!/bin/bash

mkdir -p ./docs/code
mkdir -p ./docs/code/sonifyCanvas

./node_modules/.bin/jsdoc2md dist/renderer/lib/sonifyCanvas/index.js > ./docs/code/sonifyCanvas/Readme.md