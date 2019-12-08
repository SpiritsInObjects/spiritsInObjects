#!/bin/bash

# styles
./node_modules/.bin/lessc ./src/renderer/style.less ./dist/css/style.css

# main process
./node_modules/.bin/tsc -p tsconfig.json

# renderer process
#./node_modules/.bin/tsc ./src/renderer/index.ts --outFile ./dist/renderer/index.js --noImplicitAny --lib ES2017 --lib ES2016 --lib ES2018 --lib dom -t ES2018
#./node_modules/.bin/tsc ./src/renderer/lib/spinner/index.ts --outFile ./dist/renderer/spinner.js --noImplicitAny --lib ES2017 --lib ES2016 --lib ES2018 --lib dom -t ES2018
#./node_modules/.bin/tsc ./src/renderer/lib/sonifyCanvas/index.ts --outFile ./dist/renderer/sonifyCanvas.js --noImplicitAny --lib ES2017 --lib ES2016 --lib ES2018 --lib dom -t ES2018
#./node_modules/.bin/tsc ./src/renderer/lib/camera/index.ts --outFile ./dist/renderer/camera.js --noImplicitAny --lib ES2017 --lib ES2016 --lib ES2018 --lib dom -t ES2018
./node_modules/.bin/tsc -p tsconfig.renderer.json