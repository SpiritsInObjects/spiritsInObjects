'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Visualize = void 0;
const save_pixels_1 = __importDefault(require("save-pixels"));
const os_1 = require("os");
const uuid_1 = require("uuid");
const path_1 = require("path");
const fs_extra_1 = require("fs-extra");
const ndarray_1 = __importDefault(require("ndarray"));
class Visualize {
    constructor(ffmpeg) {
        this.ffmpeg = ffmpeg;
    }
    async processAudio(state, info, tmpAudio, onProgress) {
        const filePath = state.filePath;
        const fps = typeof state.fps !== 'undefined' ? state.fps : 24;
        const height = state.vHeight;
        const samplerate = height * fps;
        const stream = info.streams.find((stream) => {
            if (typeof stream.codec_type !== 'undefined' && stream.codec_type === 'audio') {
                return true;
            }
            return false;
        });
        if (!stream) {
            throw new Error('No audio stream found');
        }
        try {
            await this.ffmpeg.resampleAudio(filePath, tmpAudio, samplerate, stream.channels, onProgress);
        }
        catch (err) {
            throw err;
        }
        return true;
    }
    async exportFrame(frameNumber, data, width, height) {
        const paddedNum = `${frameNumber}`.padStart(8, '0');
        const framePath = (0, path_1.join)(this.tmp, `${paddedNum}.png`);
        const nd = (0, ndarray_1.default)(data, [width, height, 4], [4, width * 4, 1]);
        return new Promise((resolve, reject) => {
            const stream = (0, fs_extra_1.createWriteStream)(framePath);
            stream.on('finish', function () {
                stream.close(() => {
                    resolve(true);
                });
            });
            stream.on('error', async (err) => {
                try {
                    await (0, fs_extra_1.unlink)(framePath);
                }
                catch (err) {
                    console.error(err);
                }
                reject(err);
            });
            (0, save_pixels_1.default)(nd, 'PNG').pipe(stream);
        });
    }
    async startExport(format) {
        this.tmp = (0, path_1.join)((0, os_1.tmpdir)(), (0, uuid_1.v4)());
        this.format = format;
        try {
            await (0, fs_extra_1.mkdir)(this.tmp);
        }
        catch (err) {
            throw err;
        }
        return true;
    }
    async startPreview() {
        this.tmp = (0, path_1.join)((0, os_1.tmpdir)(), (0, uuid_1.v4)());
        try {
            await (0, fs_extra_1.mkdir)(this.tmp);
        }
        catch (err) {
            throw err;
        }
        return true;
    }
    async endExport(onProgress) {
        const inputPath = (0, path_1.join)(this.tmp, `%8d.png`);
        let tmpVideo;
        let ext;
        if (this.format === 'prores3') {
            ext = 'mov';
        }
        else if (this.format === 'h264') {
            ext = 'mp4';
        }
        tmpVideo = `${this.tmp}.${ext}`;
        try {
            await this.ffmpeg.exportVideo(inputPath, tmpVideo, null, this.format, onProgress);
        }
        catch (err) {
            throw err;
        }
        try {
            await (0, fs_extra_1.rmdir)(this.tmp, { recursive: true });
        }
        catch (err) {
            throw err;
        }
        this.tmp = null;
        return tmpVideo;
    }
    async endPreview(options, onProgress) {
        const inputPath = (0, path_1.join)(this.tmp, `%8d.png`);
        const ext = 'mp4';
        let tmpVideo;
        tmpVideo = `${this.tmp}.${ext}`;
        try {
            await this.ffmpeg.exportPreview(inputPath, tmpVideo, options, onProgress);
        }
        catch (err) {
            throw err;
        }
        try {
            await (0, fs_extra_1.rmdir)(this.tmp, { recursive: true });
        }
        catch (err) {
            throw err;
        }
        this.tmp = null;
        return tmpVideo;
    }
}
exports.Visualize = Visualize;
module.exports = { Visualize };
//# sourceMappingURL=index.js.map