'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
/** class representing image sonification of the canvas */
class SonifyNode {
    /**
     * @constructor
     *
     * Creates Sonify class using a global AudioContext and canvas element
     *
     * @param {object} state
     */
    constructor(state) {
        this.framerate = 24;
        this.samprate = 48000;
        this.samplesPerFrame = this.samprate / this.framerate;
        this.RED_MULTIPLIER = 0.3;
        this.GREEN_MULTIPLIER = 0.59;
        this.BLUE_MULTIPLIER = 0.11;
        this.framerate = state.framerate;
        this.samprate = state.samplerate;
        this.samplesPerFrame = this.samprate / this.framerate;
        this.width = state.width;
        this.height = state.height;
        this.start = state.start;
        this.end = state.end;
    }
    sonify(imageData) {
        let monoBuffer = new Float32Array(this.samplesPerFrame);
        let heightMultiplier = this.height / this.samplesPerFrame;
        let scaledStart;
        let scaledEnd;
        let alpha;
        let fadeMultiplier = 1.0;
        let imageDataWidth = this.width * 4;
        let fadeLengthInSamples = 0; //30.0;
        let fadeIncrement = 1.0 / fadeLengthInSamples;
        let sample = 0;
        let len = monoBuffer.length;
        for (sample = 0; sample < len; sample++) {
            scaledStart = Math.floor(sample * heightMultiplier);
            scaledEnd = scaledStart + 1;
            alpha = (sample * heightMultiplier) - scaledStart;
            if (sample < fadeLengthInSamples) {
                fadeMultiplier = sample * fadeIncrement;
            }
            else if (sample >= monoBuffer.length - fadeLengthInSamples) {
                fadeMultiplier = ((monoBuffer.length - 1) - sample) * fadeIncrement;
            }
            else {
                fadeMultiplier = 1.0;
            }
            monoBuffer[scaledStart] = this.getRowLuminance(imageData, imageDataWidth, scaledStart, scaledEnd, alpha) * fadeMultiplier;
        }
        return monoBuffer;
    }
    getRowLuminance(data, width, scaledStart, scaledEnd, alpha) {
        //@ts-ignore state is global
        const locationOfSoundtrack = width * this.start; // determines location of optical soundtrack
        let luminance = 0;
        let L1;
        let L2;
        let scaledStartWidth = scaledStart * width;
        let scaledEndWidth = scaledEnd * width;
        // only calculate luma if the current column is within the soundtrack portion of the image
        for (let i = 0; i < width; i += 4) {
            // convert the RGB to HSL (we want L)
            if (i < locationOfSoundtrack)
                continue;
            L1 = this.RED_MULTIPLIER * data[scaledStartWidth + i * 4] + this.GREEN_MULTIPLIER * data[scaledStartWidth + i * 4 + 1] + this.BLUE_MULTIPLIER * data[scaledStartWidth + i * 4 + 2];
            L2 = this.RED_MULTIPLIER * data[scaledEndWidth + i * 4] + this.GREEN_MULTIPLIER * data[scaledEndWidth + i * 4 + 1] + this.BLUE_MULTIPLIER * data[scaledEndWidth + i * 4 + 2];
            luminance += ((1 - alpha) * L1 + alpha * L2) / 128.0 - 1.0;
        }
        luminance = luminance / (width / 4.0);
        return luminance;
    }
}
exports.SonifyNode = SonifyNode;
module.exports.SonifyNode = SonifyNode;
//# sourceMappingURL=index.js.map