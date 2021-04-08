'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.sox = void 0;
const child_process_1 = require("child_process");
const os_1 = require("os");
const path_1 = require("path");
let soxSupported = false;
let bin;
const tmp = path_1.join(os_1.tmpdir(), 'sio');
try {
    bin = require('sox-static');
    soxSupported = true;
}
catch (err) {
    console.error(err);
}
if (!soxSupported) {
    bin = require('ffmpeg-static');
}
async function spawnAsync(bin, args) {
    return new Promise((resolve, reject) => {
        const child = child_process_1.spawn(bin, args);
        let stdout = '';
        let stderr = '';
        child.on('exit', (code) => {
            if (code === 0) {
                return resolve({ stdout, stderr });
            }
            else {
                console.error(`Process exited with code: ${code}`);
                console.error(stderr);
                return reject(stderr);
            }
        });
        child.stdout.on('data', (data) => {
            stdout += data;
        });
        child.stderr.on('data', (data) => {
            stderr += data;
        });
        return child;
    });
}
//Generate a noise profile in sox:
//sox noise-audio.wav -n noiseprof noise.prof
//Clean the noise from the audio
//sox audio.wav audio-clean.wav noisered noise.prof 0.21
class sox {
    static async postProcess(input, output) {
        const args = [
            input,
            '--norm',
            output,
            'pitch',
            '-200',
            'rate',
            '48k'
        ];
        try {
            console.log(`${bin} ${args.join(' ')}`);
            await spawnAsync(bin, args);
        }
        catch (err) {
            console.error(`${bin} ${args.join(' ')}`);
            throw err;
        }
        return output;
    }
    /**
     * Resample audio to precise samplerate and merge down to mono.
     **/
    static async resample(input, output, sampleRate, channels) {
        if (!soxSupported) {
            return sox.altResample(input, output, sampleRate, channels);
        }
        const args = [
            input,
            '--norm',
            output
        ];
        if (channels > 1) {
            //mix to mono if more than 1 channel provided
            args.push('remix');
            args.push(`1-${channels}`);
        }
        //resample
        args.push('rate');
        args.push(`${sampleRate}`);
        try {
            console.log(`${bin} ${args.join(' ')}`);
            await spawnAsync(bin, args);
        }
        catch (err) {
            console.error(`${bin} ${args.join(' ')}`);
            throw err;
        }
        return output;
    }
    static async altResample(input, output, sampleRate, channels) {
        const args = [
            '-i', input,
            //mix to mono however many channels provided
            '-ac', '1',
            //resample
            '-ar', `${sampleRate}`,
            output
        ];
        try {
            console.log(`${bin} ${args.join(' ')}`);
            await spawnAsync(bin, args);
        }
        catch (err) {
            console.error(`${bin} ${args.join(' ')}`);
            throw err;
        }
        return output;
    }
}
exports.sox = sox;
module.exports.sox = sox;
//# sourceMappingURL=index.js.map