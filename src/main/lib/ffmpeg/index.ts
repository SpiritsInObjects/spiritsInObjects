'use strict';

import { spawn } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdir, unlink } from 'fs-extra';
import { createHash } from 'crypto';

const bin : string = require('ffmpeg-static').path;
const ffprobe : string = require('ffprobe-static').path;
let tmp : string;

interface StdErr {
    frame : number;
    fps : number;
    time : string;
    speed : number;
    size : string;
    remaining? : number;
    progress? : number;
    estimated? : number;
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

export class ffmpeg {
    static async info (filePath : string) : Promise<any> {
        const args : string[] = [
            '-v', 'quiet', 
            '-print_format', 'json',
            '-show_format', 
            '-show_streams', 
            filePath
        ];
        let res : any;

        try {
            res = await spawnAsync(ffprobe, args);
        } catch (err) {
            console.error(err);
        }
        //console.dir(JSON.parse(res.stdout));
        return JSON.parse(res.stdout);
    }

    static hash (data : string) : string {
        return createHash('sha1').update(data).digest('hex');
    }

    	/**
	 * Add padding to a number to 5 places. Return a string.
	 *
	 * @param {integer} i Integer to pad
	 *
	 * @returns {string} Padded string
	 **/

	static padded_frame (i : number) : string {
		let len = (i + '').length;
		let str = i + '';
		for (let x = 0; x < 8 - len; x++) {
			str = '0' + str;
		}
		return str;
    }
    
    static parseStderr (line : string) : StdErr {
        //frame= 6416 fps= 30 q=31.0 size=   10251kB time=00:03:34.32 bitrate= 391.8kbits/s speed=   1x
        let obj : any = {};

        if (line.substring(0, 'frame='.length) === 'frame=') {
            try {
                obj.frame = line.split('frame=')[1].split('fps=')[0];
                obj.frame = parseInt(obj.frame);
                obj.fps = line.split('fps=')[1].split('q=')[0];
                obj.fps = parseFloat(obj.fps);
                obj.time = line.split('time=')[1].split('bitrate=')[0];
                obj.speed = line.split('speed=')[1].trim().replace('x', '');
                obj.speed = parseFloat(obj.speed);
                obj.size = line.split('size=')[1].split('time=')[0].trim();
            } catch (err) {
                console.error(err);
                console.log(line);
                process.exit();
            }
        } else {

        }

        return obj;
    }

    static async exportPath () : Promise<string> {
        tmp = join(tmpdir(), 'sio');

        try {
            await unlink(tmp);
        } catch (err) {
            //
        }

        try {
            await mkdir(tmp);
        } catch (err) {
            //
        }
        return tmp;
    }
    
    static async export (filePath : string) : Promise<any> {
        const hash = this.hash(filePath);
        const output : string = join(tmp, `${hash}-export-%08d.png`);
        const args : string[] = [
            '-i',  filePath,
            '-compression_algo', 'raw',
            '-pix_fmt', 'rgb24',
            '-crf', '0',

            '-y',
             output
        ];
        return new Promise((resolve : Function, reject : Function) => {
            const child = spawn(bin, args);
            let stdout = '';
            let stderr = '';
            child.on('exit', (code) => {
                if (code === 0) {
                    return resolve(tmp);
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
                const line : string = data.toString();
                const obj : StdErr = this.parseStderr(line);
                /*if (obj.frame && input.frames) {
                    obj.progress = obj.frame / input.frames;
                }
                if (obj.frame && obj.speed && input.frames && input.fps) {
                    //scale by speed
                    obj.remaining = ((input.frames - obj.frame) / input.fps) / obj.speed;
                    obj.estimated = input.seconds / obj.speed;
                    if (obj.estimated > estimated) {
                        estimated = obj.estimated;
                    }
                }
                if (obj.frame) {
                    log.info(`${input.name} ${obj.frame}/${input.frames} ${Math.round(obj.progress * 1000) / 10}% ${Math.round(obj.remaining)} seconds remaining of ${Math.round(obj.estimated)}`);
                    if (onProgress) onProgress(obj);
                }*/
            });
            return child;
        });
    }

    /**
     * Export a single frame from a video.
     * 
     * @param filePath 
     * @param frame 
     */
    static async exportFrame (filePath : string, frameNum : number) : Promise<string> {
        const padded : string = this.padded_frame(frameNum);
        const hash = this.hash(filePath);
        const output : string = join(tmp, `${hash}-export-${padded}.png`);
        const args : string[] = [
            '-i',  filePath,
            '-vf',  `select='gte(n\\,${frameNum})'`, //add scaling?
            '-vframes', '1',
            '-compression_algo', 'raw',
            '-pix_fmt', 'rgb24',
            '-crf', '0',
            '-y',
             output
        ];
        let res : any;

        try {
            res = await spawnAsync(bin, args);
        } catch (err) {
            throw err;
        }

        return output;
    }
}

module.exports.ffmpeg = ffmpeg;