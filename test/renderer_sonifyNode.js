import assert from 'assert';

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

    try {
        p = await pixels('./test/example.png')
    } catch (err) {
        console.error(err)
    }

    sonify = new SonifyNode(state)

    console.time('frame')
    arr = sonify.sonify(p.data)
    console.timeEnd('frame')

    //console.dir(arr)

    wav.fromScratch(1, state.samplerate, '32f', arr)
    writeFileSync('./test/example.wav', wav.toBuffer())
    //console.dir(p)
    it('Module should be function', () => {
        console.log(typeof SonifyNode)
        console.log(typeof sonify)
        expect(typeof SonifyNode).to.equal('Function')
    })
}

module.exports = test()