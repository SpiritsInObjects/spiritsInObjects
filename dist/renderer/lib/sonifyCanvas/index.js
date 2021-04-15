'use strict';
/** class representing image sonification of a canvas element */
class Sonify {
    /**
     * @constructor
     *
     * Creates Sonify class using a canvas element
     *
     * @param {Object} state  State object containing video information
     * @param {Object} canvas Canvas to sonify
     */
    constructor(state, canvas, audioContext) {
        this.framerate = 24;
        this.samplerate = 48000;
        this.samplesPerFrame = this.samplerate / this.framerate;
        this.start = 0.81;
        this.end = 1.0;
        this.RED_MULTIPLIER = 0.3;
        this.GREEN_MULTIPLIER = 0.59;
        this.BLUE_MULTIPLIER = 0.11;
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');
        if (state.get('framerate'))
            this.framerate = state.get('framerate');
        if (state.get('start'))
            this.start = state.get('start');
        if (state.get('end'))
            this.end = state.get('end');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.samplesPerFrame = this.height;
        this.samplerate = this.samplesPerFrame * this.framerate;
        this.startLocation = Math.floor(this.width * this.start) * 4;
        this.endLocation = Math.floor(this.width * this.end) * 4;
        this.max = (Math.floor(this.width * this.end) - Math.floor(this.width * this.start)) * 255;
    }
    /**
     * Sonify's all image data in the canvas element
     *
     * @returns {array} Sound data as typed float32 array
     */
    sonifyCanvas() {
        let image = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        return this.sonify(image.data);
    }
    /**
     * Sonify pixel data stored in an rgba array [r, g, b, a] = 1px
     *
     * @param {array} imageData Pixel data stored in typed uint8 clamped array
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
     * @returns {number}
     */
    map_range(value, low1, high1, low2, high2) {
        return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
    }
    /**
     * Turn a row of image data into a single audio sample
     *
     * @param {array} row Single row of image (1px section across width)
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
    /**
     * Envelope an array of sample data in and out by n samples
     *
     * @param {array} original Audio sample data to fade
     * @param {number} envLen Length of envelope on either end
     */
    envelope(original, envLen = 30) {
        const len = original.length;
        for (let i = 0; i < len; i++) {
            if (i < envLen) {
                original[i] = original[i] * (i / envLen);
            }
            else if (i > len - envLen) {
                original[i] = original[i] * ((len - i) / envLen);
            }
        }
        return original;
    }
}
if (typeof module !== 'undefined') {
    module.exports = Sonify;
}
//# sourceMappingURL=index.js.map