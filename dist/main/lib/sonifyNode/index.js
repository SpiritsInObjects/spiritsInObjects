'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.SonifyNode = void 0;
class SonifyNode {
    constructor(state) {
        this.framerate = 24;
        this.samplerate = 48000;
        this.samplesPerFrame = this.samplerate / this.framerate;
        this.RED_MULTIPLIER = 0.3;
        this.GREEN_MULTIPLIER = 0.59;
        this.BLUE_MULTIPLIER = 0.11;
        this.framerate = state.framerate;
        this.samplerate = state.samplerate;
        this.samplesPerFrame = state.height;
        this.width = state.width;
        this.height = state.height;
        this.start = state.start;
        this.end = state.end;
        this.startLocation = Math.floor(this.width * this.start) * 4;
        this.endLocation = Math.floor(this.width * this.end) * 4;
        this.max = (Math.floor(this.width * this.end) - Math.floor(this.width * this.start)) * 255;
    }
    sonify(imageData) {
        const monoBuffer = new Float32Array(this.samplesPerFrame);
        let i = 0;
        let row;
        for (i = 0; i < this.samplesPerFrame; i++) {
            row = imageData.subarray(this.width * i * 4, this.width * (i + 1) * 4);
            monoBuffer[i] = this.getSample(row);
        }
        return monoBuffer;
    }
    brightness(r, g, b) {
        return (this.RED_MULTIPLIER * r) + (this.GREEN_MULTIPLIER * g) + (this.BLUE_MULTIPLIER * b);
    }
    map_range(value, low1, high1, low2, high2) {
        return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
    }
    getSample(row) {
        let luminance = 0;
        for (let i = 0; i < row.length; i += 4) {
            if (i < this.startLocation || i > this.endLocation)
                continue;
            luminance += this.brightness(row[i], row[i + 1], row[i + 2]);
        }
        return this.map_range(luminance, 0, this.max, -0.999999, 0.999999);
    }
}
exports.SonifyNode = SonifyNode;
module.exports.SonifyNode = SonifyNode;
//# sourceMappingURL=index.js.map