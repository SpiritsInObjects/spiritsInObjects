'use strict';

import { spawn } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';

let soxSupported = false;
let bin : string;
const tmp : string = join(tmpdir(), 'sio');

try {
   //bin = require('sox-static');
   //soxSupported = true;
} catch (err) {
    console.error(err);
}

if (!soxSupported) {
    bin = require('ffmpeg-static');
}

async function spawnAsync (bin : string, args : string[]) {
	return new Promise((resolve : Function, reject : Function) => {
        const child = spawn(bin, args);
        let stdout = '';
        let stderr = '';
        child.on('exit', (code) => {
            if (code === 0) {
                return resolve({ stdout, stderr });
            } else {
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

export class sox {
    static async postProcess (input : string, output : string) : Promise<string> {
        const args : string[] = [
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
        } catch (err) {
            console.error(`${bin} ${args.join(' ')}`);
            throw err;
        }

        return output;
    }

    /**
     * Resample audio to precise samplerate and merge down to mono.
     **/
    static async resample (input : string, output : string, sampleRate : number, channels : number) : Promise<string> {
        if (!soxSupported){
            return sox.altResample(input, output, sampleRate, channels);
        }
        const args : string[] = [
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
        args.push('rate')
        args.push(`${sampleRate}`);

        try {
            console.log(`${bin} ${args.join(' ')}`);
            await spawnAsync(bin, args);
        } catch (err) {
            console.error(`${bin} ${args.join(' ')}`);
            throw err
        }

        return output;
    }

    static async altResample (input : string, output : string, sampleRate : number, channels : number) : Promise<string> {
        const args : string [] = [
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
        } catch (err) {
            console.error(`${bin} ${args.join(' ')}`);
            throw err
        }
        
        return output;
    }
}

module.exports.sox = sox;