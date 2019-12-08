'use strict';
/** class representing image sonification of the canvas */
class Sonify {
    /**
     * @constructor
     *
     * Creates Sonify class using a global AudioContext and canvas element
     *
     * @param audioContext
     * @param canvas
     */
    constructor(audioContext, canvas) {
        this.framerate = 24;
        this.samprate = 48000;
        this.samplesPerFrame = this.samprate / this.framerate;
        this.RED_MULTIPLIER = 0.3;
        this.GREEN_MULTIPLIER = 0.59;
        this.BLUE_MULTIPLIER = 0.11;
        this.audioContext = audioContext;
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');
    }
    sonifyCanvas() {
        let heightMultiplier = (this.canvas.height / this.samplesPerFrame); //Ratio of sample size to height of frame
        let imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height); //Get Uint8ClampedArray of pixel data from canvas
        let audioBuffer = this.audioContext.createBuffer(1, this.samplesPerFrame, this.samprate); //Create AudioBuffer to support
        let monoBuffer = audioBuffer.getChannelData(0); //Get single channel buffer from AudioBuffer
        let scaledStart;
        let scaledEnd;
        let alpha;
        let fadeMultiplier = 1.0;
        let imageDataWidth = imageData.width * 4;
        let fadeLengthInSamples = 30.0;
        let fadeIncrement = 1.0 / fadeLengthInSamples;
        let sample = 0;
        let len = audioBuffer.length;
        for (sample = 0; sample < len; sample++) {
            scaledStart = Math.floor(sample * heightMultiplier);
            scaledEnd = scaledStart + 1;
            alpha = (sample * heightMultiplier) - scaledStart;
            if (sample < fadeLengthInSamples) {
                fadeMultiplier = sample * fadeIncrement;
            }
            else if (sample >= audioBuffer.length - fadeLengthInSamples) {
                fadeMultiplier = ((audioBuffer.length - 1) - sample) * fadeIncrement;
            }
            else {
                fadeMultiplier = 1.0;
            }
            monoBuffer[scaledStart] = this.getRowLuminance(imageData.data, imageDataWidth, scaledStart, scaledEnd, alpha) * fadeMultiplier;
        }
        return audioBuffer;
    }
    getRowLuminance(data, width, scaledStart, scaledEnd, alpha) {
        const locationOfSoundtrack = width * 0.72; // determines location of optical soundtrack
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
//# sourceMappingURL=index.js.map