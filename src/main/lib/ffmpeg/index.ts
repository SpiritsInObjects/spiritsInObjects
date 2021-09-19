'use strict';

import { spawn } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdir, unlink } from 'fs-extra';
import { createHash } from 'crypto';
import { spawnAsync, killSubprocess } from '../spawnAsync';

const bin : string = require('ffmpeg-static');
const ffprobe : string = require('ffprobe-static').path;
let tmp : string;


let subprocess : any = null;

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
                process.exit(1);
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
    
    static async exportFrames (filePath : string, onProgress : Function = () => {}) : Promise<any> {
        const hash = this.hash(filePath);
        const input : any = {};
        const output : string = join(tmp, `${hash}-export-%08d.png`);
        const args : string[] = [
            '-i',  filePath,
            '-compression_algo', 'raw',
            '-pix_fmt', 'rgb24',
            '-crf', '0',

            '-y',
             output
        ];
        console.log(`${bin} ${args.join(' ')}`);
        return new Promise((resolve : Function, reject : Function) => {
            subprocess = spawn(bin, args);
            let stdout = '';
            let stderr = '';
            subprocess.on('exit', (code : number) => {
                if (code === 0) {
                    return resolve(tmp);
                } else {
                    console.error(`Process exited with code: ${code}`);
                    console.error(stderr);
                    return reject(stderr);
                }
            });
            subprocess.stdout.on('data', (data : string) => {
                stdout += data;
            });
            subprocess.stderr.on('data', (data : string) => {
                const line : string = data.toString();
                const obj : StdErr = this.parseStderr(line);
                let estimated : any;
                if (obj.frame) {
                    onProgress(obj);
                }
            });
            return subprocess;
        });
    }

    static exportFramePath (hash : string, frameNum : number) : string {
        const padded : string = `${frameNum}`.padStart(8, '0');
        return join(tmp, `${hash}-export-${padded}.png`);

    }

    /**
     * Export a single frame from a video.
     * 
     * @param filePath 
     * @param frameNum
     */
    static async exportFrame (filePath : string, frameNum : number) : Promise<string> {
        const padded : string = `${frameNum}`.padStart(8, '0');
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

    static async exportVideo (inputPath : string, outputPath : string, format : string = 'prores3', onProgress : Function = () => {}) : Promise<string> {
        const args : string[] = [
            '-f', 'image2',
            '-i',  inputPath,
            '-r', '24'
        ];

        if (format === 'prores3') {
            args.push('-c:v');
            args.push('prores_ks');
            
            args.push('-profile:v');
            args.push('3');
        } else if (format === 'h264') {
            args.push('-c:v');
            args.push('libx264');

            args.push('-preset');
            args.push('slow');

            args.push('-crf');
            args.push('5');
        }
        
        args.push('-y');
        args.push(outputPath);

        console.log(`${bin} ${args.join(' ')}`);
        return new Promise((resolve : Function, reject : Function) => {
            subprocess = spawn(bin, args);
            let stdout = '';
            let stderr = '';
            subprocess.on('exit', (code : number) => {
                if (code === 0) {
                    return resolve(tmp);
                } else {
                    console.error(`Process exited with code: ${code}`);
                    console.error(stderr);
                    return reject(stderr);
                }
            });
            subprocess.stdout.on('data', (data : string) => {
                stdout += data;
            });
            subprocess.stderr.on('data', (data : string) => {
                const line : string = data.toString();
                const obj : StdErr = this.parseStderr(line);
                let estimated : any;
                if (obj.frame) {
                    onProgress(obj);
                }
            });
            return subprocess;
        });
    }

    static async resampleAudio (input : string, output : string, sampleRate : number, channels : number, onProgress : Function = () => {}) : Promise<string> {
        const args : string [] = [
            '-i', input,
            //mix to mono however many channels provided
            '-ac', '1',
            //resample
            '-ar', `${sampleRate}`,
            output
        ];

        console.log(`${bin} ${args.join(' ')}`);
        return new Promise((resolve : Function, reject : Function) => {
            subprocess = spawn(bin, args);
            let stdout = '';
            let stderr = '';
            subprocess.on('exit', (code : number) => {
                if (code === 0) {
                    return resolve(output);
                } else {
                    console.error(`Process exited with code: ${code}`);
                    console.error(stderr);
                    return reject(stderr);
                }
            });
            subprocess.stdout.on('data', (data : string) => {
                stdout += data;
            });
            subprocess.stderr.on('data', (data : string) => {
                const line : string = data.toString();
                const obj : StdErr = this.parseStderr(line);
                let estimated : any;
                if (obj.frame) {
                    onProgress(obj);
                }
            });
            return subprocess;
        });
    }

    /**
     * Render a proxy of a video using settings optimized for fast rendering times.
     * Optionally forc video into the scale provided by the options.width and
     * option.height settings. Optionally add an audio file as the sondtrack of the 
     * preview video.
     * 
     * @param {string} inputPath
     * @param {string} outputPath
     * @param {object} options Preview Options
     **/

    static async exportPreview (inputPath : string, outputPath : string, options : PreviewOptions, onProgress : Function = () => {}) : Promise<string> {
        const width : number = options.width;
        const height : number = options.height;
        let args : string[] = [
            '-i',  inputPath
        ];

        if (typeof options.audio !== 'undefined') {
            args = args.concat([
                '-i', options.audio, 
                '-map', '0:v',
                '-map', '1:a',
                '-c:a', 'aac'
            ]);
        }

        if (options.forceScale) {
            args = args.concat([
                '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
            ]);
        }

        args = args.concat([
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-crf', '22',
            '-y',
             outputPath
        ])
        let res : any;

        console.log(`${bin} ${args.join(' ')}`);
        return new Promise((resolve : Function, reject : Function) => {
            subprocess = spawn(bin, args);
            let stdout = '';
            let stderr = '';
            subprocess.on('exit', (code : number) => {
                if (code === 0) {
                    return resolve(tmp);
                } else {
                    console.error(`Process exited with code: ${code}`);
                    console.error(stderr);
                    return reject(stderr);
                }
            });
            subprocess.stdout.on('data', (data : string) => {
                stdout += data;
            });
            subprocess.stderr.on('data', (data : string) => {
                const line : string = data.toString();
                const obj : StdErr = this.parseStderr(line);
                let estimated : any;
                if (obj.frame) {
                    onProgress(obj);
                }
            });
            return subprocess;
        });
    }

    /**
     * Kill the subprocess that is currently running in spawn mode.
     * 
     **/

    static async cancel () {
        let cancelled : boolean = false;
        if (subprocess && typeof subprocess['kill'] !== 'undefined') {
            try {
                await killSubprocess(subprocess);
                subprocess = null;
                cancelled = true;
            } catch (err) {
                console.error(err);
            }
        }
        return cancelled;
    }

    //ffmpeg -i "movie.wav" -itsoffset 1.0833 -i "movie.mp4" -map 1:v -map 0:a -c copy "movie-video-delayed.mp4"
}

module.exports.ffmpeg = ffmpeg;