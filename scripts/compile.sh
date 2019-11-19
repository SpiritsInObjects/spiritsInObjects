#!/bin/bash

# styles
./node_modules/.bin/lessc ./src/renderer/style.less ./dist/css/style.css

# main process
./node_modules/.bin/tsc -p tsconfig.json --extendedDiagnostics

# renderer process
./node_modules/.bin/tsc ./src/renderer/index.ts --outFile ./dist/renderer/index.js --noImplicitAny --lib ES2017 --lib ES2016 --lib ES2018 --lib dom -t ES2018