'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.ffmpeg = void 0;
const child_process_1 = require("child_process");
const os_1 = require("os");
const path_1 = require("path");
const fs_extra_1 = require("fs-extra");
const crypto_1 = require("crypto");
const spawnAsync_1 = require("../spawnAsync");
const bin = require('ffmpeg-static');
const ffprobe = require('ffprobe-static').path;
let tmp;
let subprocess = null;
let background = null;
/* static class representing all video exporting features using ffmpeg and ffprobe */
class ffmpeg {
    /**
     * Return an object describing a file from ffprobe
     *
     * @param {string} filePath     File to generate info about
     *
     * @returns {object} Parsed JSON object containing info
     **/
    static async info(filePath) {
        const args = [
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            filePath
        ];
        let res;
        try {
            res = await (0, spawnAsync_1.spawnAsync)(ffprobe, args);
        }
        catch (err) {
            console.error(err);
        }
        //console.dir(JSON.parse(res.stdout));
        return JSON.parse(res.stdout);
    }
    /**
     * Generate a SHA1 hash of a file. Used for determining
     * if preview files have already been generated for unique
     * files.
     *
     * @param {string} data       Data to hash (file path, mostly)
     *
     * @returns {string} Hash in hex format
     **/
    static hash(data) {
        return (0, crypto_1.createHash)('sha1').update(data).digest('hex');
    }
    /**
     * Callback for parsing lines of stderr output from ffmpeg.
     * Used for determining progress of import/exports.
     *
     * @param {string} line     Line from ffmpeg stderr
     *
     * @returns {obj}  Object of the StdErr type
     **/
    static parseStderr(line) {
        //frame= 6416 fps= 30 q=31.0 size=   10251kB time=00:03:34.32 bitrate= 391.8kbits/s speed=   1x
        let obj = {};
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
            }
            catch (err) {
                console.error(err);
                console.log(line);
                process.exit(1);
            }
        }
        else {
        }
        return obj;
    }
    /**
     * Creates a temporary directory for sio data if
     * it does not exist. Returns the location, which will
     * differ based on OS.
     *
     * @returns {string} Path to sio temporary directory
     **/
    static async exportPath() {
        tmp = (0, path_1.join)((0, os_1.tmpdir)(), 'sio');
        try {
            await (0, fs_extra_1.rmdirSync)(tmp, { recursive: true });
        }
        catch (err) {
            console.error(err);
        }
        try {
            await (0, fs_extra_1.mkdir)(tmp);
        }
        catch (err) {
            console.error(err);
        }
        return tmp;
    }
    /**
     * Export all frames from a video in an image sequence.
     *
     * @param {string} filePath         Path to file to export
     * @param {Function} onProgress     (Optional) Callback on progress
     *
     * @returns {object} Result of process
     **/
    static async exportFrames(filePath, onProgress = () => { }) {
        const hash = this.hash(filePath);
        const input = {};
        const output = (0, path_1.join)(tmp, `${hash}-export-%08d.png`);
        const args = [
            '-i', filePath,
            '-compression_algo', 'raw',
            '-pix_fmt', 'rgb24',
            '-crf', '0',
            '-y',
            output
        ];
        console.log(`${bin} ${args.join(' ')}`);
        return new Promise((resolve, reject) => {
            subprocess = (0, child_process_1.spawn)(bin, args);
            let stdout = '';
            let stderr = '';
            subprocess.on('exit', (code) => {
                subprocess = null;
                if (code === 0) {
                    return resolve(tmp);
                }
                else {
                    console.error(`Process exited with code: ${code}`);
                    console.error(stderr);
                    return reject(stderr);
                }
            });
            subprocess.stdout.on('data', (data) => {
                stdout += data;
            });
            subprocess.stderr.on('data', (data) => {
                const line = data.toString();
                const obj = this.parseStderr(line);
                let estimated;
                if (obj.frame) {
                    onProgress(obj);
                }
            });
            return subprocess;
        });
    }
    /**
     * Path to export a single frame to.
     *
     * @param {string} hash         Hash of the file being exported
     * @param {number} frameNum     Frame number to be padded
     *
     * @returns {string} Path to use for frame
     **/
    static exportFramePath(hash, frameNum) {
        const padded = `${frameNum}`.padStart(8, '0');
        return (0, path_1.join)(tmp, `${hash}-export-${padded}.png`);
    }
    /**
     * Export a single frame from a video.
     *
     * @param filePath
     * @param frameNum
     */
    static async exportFrame(filePath, frameNum) {
        const padded = `${frameNum}`.padStart(8, '0');
        const hash = this.hash(filePath);
        const output = (0, path_1.join)(tmp, `${hash}-export-${padded}.png`);
        const args = [
            '-i', filePath,
            '-vf', `select='gte(n\\,${frameNum})'`,
            '-vframes', '1',
            '-compression_algo', 'raw',
            '-pix_fmt', 'rgb24',
            '-crf', '0',
            '-y',
            output
        ];
        let res;
        try {
            res = await (0, spawnAsync_1.spawnAsync)(bin, args);
        }
        catch (err) {
            throw err;
        }
        return output;
    }
    /**
     * Export a final version of a video, stitched from individual frames.
     * Used by Visualize and Timeline modules.
     *
     * @param {string} inputPath     Path template of input files
     * @param {string} outputPath    Path of output video
     * @param {string} audio         (Optional) Path to audio file to assign to video
     * @param {string} format        (Optional) Format of exported video (prores/h264)
     * @param {Function} onProgress  (Optional) Callback on progress
     *
     * @returns {string} Path of resulting video (equal to outputPath)
     **/
    static async exportVideo(inputPath, outputPath, audio = null, format = 'prores3', onProgress = () => { }) {
        let args = [
            '-framerate', '24',
            '-f', 'image2',
            '-i', inputPath
        ];
        if (audio != null) {
            args = args.concat([
                '-i', audio,
                '-map', '0:v',
                '-map', '1:a',
                '-c:a', 'aac'
            ]);
        }
        if (format === 'prores3') {
            args = args.concat([
                '-c:v', 'prores_ks',
                '-profile:v', '3'
            ]);
        }
        else if (format === 'h264') {
            args = args.concat([
                '-c:v', 'libx264',
                '-preset', 'slow',
                '-crf', '5'
            ]);
        }
        args = args.concat([
            '-r', '24',
            '-y', outputPath
        ]);
        console.log(`${bin} ${args.join(' ')}`);
        return new Promise((resolve, reject) => {
            subprocess = (0, child_process_1.spawn)(bin, args);
            let stdout = '';
            let stderr = '';
            subprocess.on('exit', (code) => {
                subprocess = null;
                if (code === 0) {
                    return resolve(outputPath);
                }
                else {
                    console.error(`Process exited with code: ${code}`);
                    console.error(stderr);
                    return reject(stderr);
                }
            });
            subprocess.stdout.on('data', (data) => {
                stdout += data;
            });
            subprocess.stderr.on('data', (data) => {
                const line = data.toString();
                const obj = this.parseStderr(line);
                let estimated;
                if (obj.frame) {
                    onProgress(obj);
                }
            });
            return subprocess;
        });
    }
    /**
     * Resample an audio file to a new samplerate. Used because of the
     * odd samplerates created by the sonify methods.
     *
     * @param {string} input         Path to input audio file
     * @param {string} output        Path to output audio file
     * @param {number} sampleRate    Target samplerate of new file
     * @param {number} channels      Number of channels in new file (unused currently)
     * @param {Function} onProgress  (Optional) Callback on progress
     *
     * @returns {string} Path to new audio file (equal to output)
     **/
    static async resampleAudio(input, output, sampleRate, channels, onProgress = () => { }) {
        const args = [
            '-i', input,
            //mix to mono however many channels provided
            '-ac', '1',
            //resample
            '-ar', `${sampleRate}`,
            output
        ];
        console.log(`${bin} ${args.join(' ')}`);
        return new Promise((resolve, reject) => {
            subprocess = (0, child_process_1.spawn)(bin, args);
            let stdout = '';
            let stderr = '';
            subprocess.on('exit', (code) => {
                subprocess = null;
                if (code === 0) {
                    return resolve(output);
                }
                else {
                    console.error(`Process exited with code: ${code}`);
                    console.error(stderr);
                    return reject(stderr);
                }
            });
            subprocess.stdout.on('data', (data) => {
                stdout += data;
            });
            subprocess.stderr.on('data', (data) => {
                const line = data.toString();
                const obj = this.parseStderr(line);
                let estimated;
                if (obj.frame) {
                    onProgress(obj);
                }
            });
            return subprocess;
        });
    }
    /**
     * Concatinate multiple audio files into a single file.
     * Used to join samples quickly for the Timeline module.
     *
     * @param {array} audioTimeline     Array of paths to files to join
     * @param {string} tmpAudio            Output audio file to create
     * @param {Function} onProgress        (Optional) Callback on progress
     *
     * @returns {boolean}  Whether process is successful
     **/
    static async concatAudio(audioTimeline, tmpAudio, onProgress = () => { }) {
        const tmpList = (0, path_1.join)(tmp, 'sioaudiofilelist.txt');
        let fileList;
        fileList = audioTimeline.map((file) => {
            return `file '${file}'`;
        });
        try {
            await (0, fs_extra_1.writeFile)(tmpList, fileList.join('\n'), 'utf8');
        }
        catch (err) {
            console.error(err);
            return false;
        }
        try {
            await ffmpeg.concatAudioExec(tmpList, tmpAudio, onProgress);
        }
        catch (err) {
            console.error(err);
            return false;
        }
        try {
            await (0, fs_extra_1.unlink)(tmpList);
        }
        catch (err) {
            console.error(err);
            return false;
        }
        return true;
    }
    /**
     * Executes the ffmpeg command which concatinates audio files using
     * the list of files created with method concatAudio().
     *
     * @param {string} fileList         Path of list of audio files
     * @param {string} output           Path of output audio file
     * @param {Function} onProgress     Callback on progress
     *
     * @returns {string} output         Path of output file
     **/
    static async concatAudioExec(fileList, output, onProgress) {
        const args = [
            '-y',
            '-f', 'concat',
            '-safe', '0',
            '-i', fileList,
            '-vn',
            '-ac', '1',
            output
        ];
        console.log(`${bin} ${args.join(' ')}`);
        return new Promise((resolve, reject) => {
            subprocess = (0, child_process_1.spawn)(bin, args);
            let stdout = '';
            let stderr = '';
            subprocess.on('exit', (code) => {
                subprocess = null;
                if (code === 0) {
                    return resolve(output);
                }
                else {
                    console.error(`Process exited with code: ${code}`);
                    console.error(stderr);
                    return reject(stderr);
                }
            });
            subprocess.stdout.on('data', (data) => {
                stdout += data;
            });
            subprocess.stderr.on('data', (data) => {
                const line = data.toString();
                const obj = this.parseStderr(line);
                let estimated;
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
     * @param {string} inputPath       Path of input file
     * @param {string} outputPath      Path of output file
     * @param {object} options         PreviewOptions type containing options
     * @param {Function} onProgress    (Optional) Callback on progress
     *
     * @returns {string} Path of output file
     **/
    static async exportPreview(inputPath, outputPath, options, onProgress = () => { }) {
        const width = options.width;
        const height = options.height;
        let args = [];
        if (typeof options.sequence !== 'undefined' && options.sequence) {
            args = args.concat([
                '-framerate', '24',
                '-f', 'image2'
            ]);
        }
        args = args.concat([
            '-i', inputPath
        ]);
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
        ]);
        let res;
        console.log(`${bin} ${args.join(' ')}`);
        return new Promise((resolve, reject) => {
            subprocess = (0, child_process_1.spawn)(bin, args);
            let stdout = '';
            let stderr = '';
            subprocess.on('exit', (code) => {
                subprocess = null;
                if (code === 0) {
                    return resolve(outputPath);
                }
                else {
                    console.error(`Process exited with code: ${code}`);
                    console.error(stderr);
                    return reject(stderr);
                }
            });
            subprocess.stdout.on('data', (data) => {
                stdout += data;
            });
            subprocess.stderr.on('data', (data) => {
                const line = data.toString();
                const obj = this.parseStderr(line);
                if (obj.frame) {
                    onProgress(obj);
                }
            });
            return subprocess;
        });
    }
    /**
     * Cancel the subprocess that is currently running in spawn mode.
     *
     * @returns {boolean} Whether process has been successfully cancelled
     **/
    static async cancel() {
        let cancelled = false;
        if (subprocess && typeof subprocess['kill'] !== 'undefined') {
            try {
                await (0, spawnAsync_1.killSubprocess)(subprocess);
                subprocess = null;
                cancelled = true;
            }
            catch (err) {
                console.error(err);
            }
        }
        return cancelled;
    }
    /**
     * Cancel the background process that is currently running in spawn mode.
     *
     * @returns {boolean} Whether process has been successfully cancelled
     **/
    static async cancelBackground() {
        let cancelled = false;
        if (background && typeof background['kill'] !== 'undefined') {
            try {
                await (0, spawnAsync_1.killSubprocess)(background);
                background = null;
                cancelled = true;
            }
            catch (err) {
                console.error(err);
            }
        }
        return cancelled;
    }
}
exports.ffmpeg = ffmpeg;
module.exports.ffmpeg = ffmpeg;
//# sourceMappingURL=index.js.map