'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.SonifyNode = void 0;
class SonifyNode {
    /**
     * @constructor
     *
     * Creates Sonify class using a global AudioContext and canvas element
     *
     * @param {object} state     State contains all settings which can be passed to class
     */
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
    /**
     * Sonify pixel data stored in an rgba array [r, g, b, a] = 1px
     *
     * @param {array} imageData     Pixel data stored in typed uint8 clamped array
     *
     * @returns {array} Sound data as typed float32 array
     */
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
    /**
     * Calculate the brightness of a pixel using channel multipliers
     *
     * @param {number} r Red channel value
     * @param {number} g Green channel value
     * @param {number} b Blue channel value
     *
     * @returns {number} Brightness value
     */
    brightness(r, g, b) {
        return (this.RED_MULTIPLIER * r) + (this.GREEN_MULTIPLIER * g) + (this.BLUE_MULTIPLIER * b);
    }
    /**
     * Map a value from one range to a target range, implemented to mimic
     * Processing map() function
     *
     * @param {number} value Value to scale
     * @param {number} low1 Low of initial scale
     * @param {number} high1 High of initial scale
     * @param {number} low2 Low of target scale
     * @param {number} high2 High of target scale
     *
     * @returns {number} Mapped value
     */
    map_range(value, low1, high1, low2, high2) {
        return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
    }
    /**
     * Turn a row of image data into a single audio sample
     *
     * @param {array} row Single row of image (1px section across width)
     *
     * @returns {number} Mapped total value of row
     */
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