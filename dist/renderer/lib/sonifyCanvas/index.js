'use strict';
//https://stackoverflow.com/questions/37459231/webaudio-seamlessly-playing-sequence-of-audio-chunks?answertab=votes#tab-top
class SoundBuffer {
    constructor(ctx, sampleRate, bufferSize = 6, debug = true) {
        this.ctx = ctx;
        this.sampleRate = sampleRate;
        this.bufferSize = bufferSize;
        this.debug = debug;
        this.chunks = [];
        this.isPlaying = false;
        this.startTime = 0;
        this.lastChunkOffset = 0;
    }
    createChunk(chunk) {
        var audioBuffer = this.ctx.createBuffer(2, chunk.length, this.sampleRate);
        audioBuffer.getChannelData(0).set(chunk);
        var source = this.ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.ctx.destination);
        source.onended = (e) => {
            this.chunks.splice(this.chunks.indexOf(source), 1);
            if (this.chunks.length == 0) {
                this.isPlaying = false;
                this.startTime = 0;
                this.lastChunkOffset = 0;
            }
        };
        return source;
    }
    log(data) {
        if (this.debug) {
            console.log(new Date().toUTCString() + " : " + data);
        }
    }
    addChunk(data) {
        if (this.isPlaying && (this.chunks.length > this.bufferSize)) {
            this.log("chunk discarded");
            return; // throw away
        }
        else if (this.isPlaying && (this.chunks.length <= this.bufferSize)) { // schedule & add right now
            this.log("chunk accepted");
            let chunk = this.createChunk(data);
            chunk.start(this.startTime + this.lastChunkOffset);
            this.lastChunkOffset += chunk.buffer.duration;
            this.chunks.push(chunk);
        }
        else if ((this.chunks.length < (this.bufferSize / 2)) && !this.isPlaying) { // add & don't schedule
            this.log("chunk queued");
            let chunk = this.createChunk(data);
            this.chunks.push(chunk);
        }
        else { // add & schedule entire buffer
            this.log("queued chunks scheduled");
            this.isPlaying = true;
            let chunk = this.createChunk(data);
            this.chunks.push(chunk);
            this.startTime = this.ctx.currentTime;
            this.lastChunkOffset = 0;
            for (let i = 0; i < this.chunks.length; i++) {
                let chunk = this.chunks[i];
                chunk.start(this.startTime + this.lastChunkOffset);
                this.lastChunkOffset += chunk.buffer.duration;
            }
        }
    }
}
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
        this.framerate = state.framerate;
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
        //@ts-ignore state is global
        const locationOfSoundtrack = width * state.start; // determines location of optical soundtrack
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