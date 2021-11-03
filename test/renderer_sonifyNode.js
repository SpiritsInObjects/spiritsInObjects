const assert = require('assert');

const { writeFileSync } = require('fs')
const getPixels = require('get-pixels')
const { WaveFile } = require('wavefile')
const { SonifyNode } = require('../dist/main/lib/sonifyNode')

async function pixels (filePath) {
	return new Promise((resolve, reject) => {
		return getPixels(filePath, (err, imageData) => {
			if (err) {
				return reject(err);
			}
			return resolve(imageData);
		});
	});
}

async function test () {
    const wav = new WaveFile();
    const state = {
        framerate : 24,
        samplerate : 44100,
        height : 1837,
        width : 1837,
        start : 0.72,
        end : 1.0
    }
    let p
    let sonify
    let arr

    sonify = new SonifyNode(state)

    console.time('frame from disk')
    try {
        p = await pixels('./test/example.png')
    } catch (err) {
        console.error(err)
    }

    console.time('frame')
    arr = sonify.sonify(p.data)
    console.timeEnd('frame')
    console.timeEnd('frame from disk')

    wav.fromScratch(1, state.samplerate, '32f', arr)
    writeFileSync('./test/example.wav', wav.toBuffer())

    it('Module should be function', () => {
        assert.equal(typeof SonifyNode, 'function')
    })
    it('Image shape should be equal to pre-defined sonify state', () => {
        assert.equal(p.shape[0], state.width)
        assert.equal(p.shape[1], state.height)
    })
    it('Array length should equal height of image', () => {
        assert.equal(arr.length, state.height)
    })
    it('Array should not contain a value greater than 1', () => {
        let max = 0;
        for (let val of arr) {
            if (val > max) {
                max = val;
            }
        }
        console.log(`max: ${max}`)
        assert.ok(max < 1)
    })
    it('Array should not contain a value less than -1', () => {
        let min = 0;
        for (let val of arr) {
            if (val < min) {
                min = val;
            }
        }
        console.log(`min: ${min}`)
        assert.ok(min > -1)
    })
}

module.exports = test()