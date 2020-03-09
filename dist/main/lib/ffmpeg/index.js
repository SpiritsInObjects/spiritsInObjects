'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const os_1 = require("os");
const path_1 = require("path");
const fs_extra_1 = require("fs-extra");
const crypto_1 = require("crypto");
const bin = require('ffmpeg-static').path;
const ffprobe = require('ffprobe-static').path;
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
class ffmpeg {
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
            res = await spawnAsync(ffprobe, args);
        }
        catch (err) {
            console.error(err);
        }
        //console.dir(JSON.parse(res.stdout));
        return JSON.parse(res.stdout);
    }
    static hash(data) {
        return crypto_1.createHash('sha1').update(data).digest('hex');
    }
    /**
 * Add padding to a number to 5 places. Return a string.
 *
 * @param {integer} i Integer to pad
 *
 * @returns {string} Padded string
 **/
    static padded_frame(i) {
        let len = (i + '').length;
        let str = i + '';
        for (let x = 0; x < 8 - len; x++) {
            str = '0' + str;
        }
        return str;
    }
    static async exportPath() {
        try {
            await fs_extra_1.unlink(tmp);
        }
        catch (err) {
            //
        }
        try {
            await fs_extra_1.mkdir(tmp);
        }
        catch (err) {
            //
        }
        return tmp;
    }
    static async export(filePath) {
        const hash = this.hash(filePath);
        const output = path_1.join(tmp, `${hash}-export-%08d.png`);
        const args = [
            '-i', filePath,
            '-compression_algo', 'raw',
            '-pix_fmt', 'rgb24',
            '-crf', '0',
            '-y',
            output
        ];
        let res;
        try {
            res = await spawnAsync(bin, args);
        }
        catch (err) {
            console.error(err);
        }
        return tmp;
    }
    /**
     * Export a single frame from a video.
     *
     * @param filePath
     * @param frame
     */
    static async exportFrame(filePath, frameNum) {
        const padded = this.padded_frame(frameNum);
        const hash = this.hash(filePath);
        const output = path_1.join(tmp, `${hash}-export-${padded}.png`);
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
            res = await spawnAsync(bin, args);
        }
        catch (err) {
            throw err;
        }
        return output;
    }
}
exports.ffmpeg = ffmpeg;
module.exports.ffmpeg = ffmpeg;
//# sourceMappingURL=index.js.map