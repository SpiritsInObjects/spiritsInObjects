'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Timeline = void 0;
const os_1 = require("os");
const path_1 = require("path");
const fs_extra_1 = require("fs-extra");
const save_pixels_1 = __importDefault(require("save-pixels"));
const ndarray_1 = __importDefault(require("ndarray"));
class Timeline {
    constructor(ffmpeg) {
        this.tmpDir = path_1.join(os_1.tmpdir(), 'siotimeline');
        this.binDir = path_1.join(os_1.tmpdir(), 'siobin');
        this.ffmpeg = ffmpeg;
    }
    async makeTmp(dir) {
        try {
            await fs_extra_1.mkdir(dir, { recursive: true });
        }
        catch (err) {
            console.error(err);
        }
    }
    async emptyTmp(dir) {
        let files;
        try {
            files = await fs_extra_1.readdir(dir);
        }
        catch (err) {
            throw err;
            return false;
        }
        for (const file of files) {
            try {
                await fs_extra_1.unlink(path_1.join(dir, file));
            }
            catch (err) {
                throw err;
                return false;
            }
        }
    }
    async exportFrame(id, data, width, height) {
        const framePath = path_1.join(this.binDir, `${id}.png`);
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
    async copyFrame(id, filePath) {
        const framePath = path_1.join(this.binDir, `${id}.png`);
        try {
            await fs_extra_1.copy(filePath, framePath);
        }
        catch (err) {
            console.error(err);
            return false;
        }
    }
    async images(bin, timeline) {
        let frameNumber = 0;
        let paddedNum;
        let framePath;
        let ext = 'png';
        let dirs = [this.tmpDir];
        for (let dir of dirs) {
            try {
                await this.makeTmp(dir);
            }
            catch (err) {
                console.error(err);
                return false;
            }
            try {
                await this.emptyTmp(dir);
            }
            catch (err) {
                console.error(err);
                return false;
            }
        }
        for (let frame of timeline) {
            paddedNum = `${frameNumber}`.padStart(8, '0');
            framePath = path_1.join(this.tmpDir, `${paddedNum}.${ext}`);
            try {
                await fs_extra_1.copy(bin[frame], framePath);
            }
            catch (err) {
                console.error(err);
                return false;
            }
            frameNumber++;
        }
    }
}
exports.Timeline = Timeline;
module.exports = { Timeline };
//# sourceMappingURL=index.js.map