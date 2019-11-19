#!/bin/bash

# main process
./node_modules/.bin/tsc -p tsconfig.json --extendedDiagnostics

# renderer process
./node_modules/.bin/tsc ./src/renderer/index.ts --outFile ./dist/renderer/index.js --noImplicitAny --lib ES2017 --lib ES2016 --lib dom -t ES2016