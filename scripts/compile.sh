#!/bin/bash

# main process
./node_modules/.bin/tsc -p tsconfig.json --extendedDiagnostics

# renderer process
./node_modules/.bin/tsc ./renderer/index.ts --outFile ./renderer/index.js --noImplicitAny --lib ES2017 --lib ES2016 --lib dom -t ES2016