'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.sox = void 0;
const child_process_1 = require("child_process");
const os_1 = require("os");
const path_1 = require("path");
const bin = require('sox-static');
const tmp = path_1.join(os_1.tmpdir(), 'sio');
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