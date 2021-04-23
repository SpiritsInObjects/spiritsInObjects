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
        const framePath = path_1.join(this.tmp, `${paddedNum}.png`);
        const nd = ndarray_1.default(data, [width, height, 4], [4, width * 4, 1]);
        return new Promise((resolve, reject) => {
            const stream = fs_extra_1.createWriteStream(framePath);
            stream.on('finish', function () {
                stream.close(() => {
                    resolve(true);
                });
            });
            stream.on('error', async (err) => {
                try {
                    await fs_extra_1.unlink(framePath);
                }
                catch (err) {
                    console.error(err);
                }
                reject(err);
            });
            save_pixels_1.default(nd, 'PNG').pipe(stream);
        });
    }
    async startExport() {
        this.tmp = path_1.join(os_1.tmpdir(), uuid_1.v4());
        try {
            await fs_extra_1.mkdir(this.tmp);
        }
        catch (err) {
            throw err;
        }
        return true;
    }
    async endExport(onProgress) {
        const inputPath = path_1.join(this.tmp, `%8d.png`);
        const tmpVideo = `${this.tmp}.mp4`;
        try {
            await this.ffmpeg.exportVideo(inputPath, tmpVideo, onProgress);
        }
        catch (err) {
            throw err;
        }
        try {
            //@ts-ignore
            await fs_extra_1.rmdir(this.tmp, { recursive: true });
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