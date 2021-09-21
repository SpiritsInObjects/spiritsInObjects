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
const wavefile_1 = require("wavefile");
const uuid_1 = require("uuid");
class Timeline {
    constructor(ffmpeg) {
        this.tmpDir = path_1.join(os_1.tmpdir(), 'siotimeline');
        this.binDir = path_1.join(os_1.tmpdir(), 'siobin');
        this.cancelled = false;
        this.ffmpeg = ffmpeg;
        this.initDirs();
    }
    async initDirs() {
        let dirs = [this.tmpDir, this.binDir];
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
                    resolve(framePath);
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
        }
        return framePath;
    }
    async exportAudio(id, samples) {
        const audioPath = path_1.join(this.binDir, `${id}.wav`);
        const wav = new wavefile_1.WaveFile();
        wav.fromScratch(1, samples.length * 24, '32f', samples);
        try {
            await fs_extra_1.writeFile(audioPath, wav.toBuffer());
        }
        catch (err) {
            console.error(err);
        }
        return audioPath;
    }
    async images(timeline) {
        let frameNumber = 0;
        let paddedNum;
        let binPath;
        let framePath;
        let ext = 'png';
        for (let frame of timeline) {
            if (frame == null) {
                frame = 'blank';
            }
            paddedNum = `${frameNumber}`.padStart(8, '0');
            framePath = path_1.join(this.tmpDir, `${paddedNum}.${ext}`);
            binPath = path_1.join(this.binDir, `${frame}.${ext}`);
            try {
                await fs_extra_1.copy(binPath, framePath);
            }
            catch (err) {
                console.error(err);
                return false;
            }
            frameNumber++;
            if (this.cancelled) {
                this.cancelled = false;
                return false;
            }
        }
        return true;
    }
    async audio(timeline) {
        let frameNumber = 0;
        let paddedNum;
        let binPath;
        let framePath;
        let ext = 'wav';
        let fileList = [];
        for (let frame of timeline) {
            if (frame == null) {
                frame = 'silence';
            }
            paddedNum = `${frameNumber}`.padStart(8, '0');
            framePath = path_1.join(this.tmpDir, `${paddedNum}.${ext}`);
            binPath = path_1.join(this.binDir, `${frame}.${ext}`);
            try {
                await fs_extra_1.copy(binPath, framePath);
            }
            catch (err) {
                console.error(err);
                return;
            }
            fileList.push(framePath);
            frameNumber++;
            if (this.cancelled) {
                this.cancelled = false;
                return;
            }
        }
        return fileList;
    }
    async export(timeline, tmpVideo, onProgress) {
        let id = uuid_1.v4();
        let success = false;
        let tmpAudio = path_1.join(this.tmpDir, `${id}.wav`);
        let framesPath = path_1.join(this.tmpDir, `%08d.png`);
        let audioList;
        try {
            await this.emptyTmp(this.tmpDir);
        }
        catch (err) {
            console.error(err);
            return false;
        }
        success = await this.images(timeline);
        if (!success)
            return success;
        audioList = await this.audio(timeline);
        if (!audioList) {
            success = false;
            return success;
        }
        await this.ffmpeg.concatAudio(audioList, tmpAudio, onProgress);
        await this.ffmpeg.exportVideo(framesPath, tmpVideo, tmpAudio, 'prores3', onProgress);
        await fs_extra_1.unlink(tmpAudio);
        return success;
    }
    cancel() {
        this.cancelled = true;
    }
}
exports.Timeline = Timeline;
module.exports = { Timeline };
//# sourceMappingURL=index.js.map