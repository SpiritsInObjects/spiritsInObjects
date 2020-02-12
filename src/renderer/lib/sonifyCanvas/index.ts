'use strict';

//https://stackoverflow.com/questions/37459231/webaudio-seamlessly-playing-sequence-of-audio-chunks?answertab=votes#tab-top
class SoundBuffer {
    private chunks : Array<AudioBufferSourceNode> = [];
    private isPlaying: boolean = false;
    private startTime: number = 0;
    private lastChunkOffset: number = 0;

    constructor(public ctx:AudioContext, public sampleRate:number,public bufferSize:number = 6, private debug = true) { }

    private createChunk(chunk:Float32Array)  {
        var audioBuffer = this.ctx.createBuffer(2, chunk.length, this.sampleRate);
        audioBuffer.getChannelData(0).set(chunk);
        var source = this.ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.ctx.destination);
        source.onended = (e:Event) => { 
            this.chunks.splice(this.chunks.indexOf(source),1);
            if (this.chunks.length == 0) {
                this.isPlaying = false;
                this.startTime = 0;
                this.lastChunkOffset = 0;
            }
        };

        return source;
    }

    private log(data:string) {
        if (this.debug) {
            console.log(new Date().toUTCString() + " : " + data);
        }
    }

    public addChunk(data: Float32Array) {
        if (this.isPlaying && (this.chunks.length > this.bufferSize)) {
            this.log("chunk discarded");
            return; // throw away
        } else if (this.isPlaying && (this.chunks.length <= this.bufferSize)) { // schedule & add right now
            this.log("chunk accepted");
            let chunk = this.createChunk(data);
            chunk.start(this.startTime + this.lastChunkOffset);
            this.lastChunkOffset += chunk.buffer.duration;
            this.chunks.push(chunk);
        } else if ((this.chunks.length < (this.bufferSize / 2)) && !this.isPlaying) {  // add & don't schedule
            this.log("chunk queued");
            let chunk = this.createChunk(data);
            this.chunks.push(chunk);
        } else  { // add & schedule entire buffer
            this.log("queued chunks scheduled");
            this.isPlaying = true;
            let chunk = this.createChunk(data);
            this.chunks.push(chunk);
            this.startTime = this.ctx.currentTime;
            this.lastChunkOffset = 0;
            for (let i = 0;i<this.chunks.length;i++) {
                let chunk = this.chunks[i];
                chunk.start(this.startTime + this.lastChunkOffset);
                this.lastChunkOffset += chunk.buffer.duration;
            }
        }
    }
}

/** class representing image sonification of the canvas */
class Sonify {
    private audioContext : AudioContext;
    private canvas : HTMLCanvasElement;
    private ctx : CanvasRenderingContext2D;
    private framerate = state.framerate || 24;
    private samprate = 48000;
    private samplesPerFrame = this.samprate / this.framerate;

    private RED_MULTIPLIER : number = 0.3;
    private GREEN_MULTIPLIER : number = 0.59;
    private BLUE_MULTIPLIER : number = 0.11;

    /**
     * @constructor
     * 
     * Creates Sonify class using a global AudioContext and canvas element
     * 
     * @param audioContext 
     * @param canvas 
     */

    constructor (audioContext : AudioContext, canvas : HTMLCanvasElement) {
        this.audioContext = audioContext;
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');
    }

    public sonifyCanvas () : AudioBuffer {
        let heightMultiplier : number = (this.canvas.height / this.samplesPerFrame);                                //Ratio of sample size to height of frame
        //OPTIMIZATION POTENTIAL
        //Only get image data after the start and to the end of the frame.
        //Will potentially save 72% of loop in getRowLuminance() routine.
        //Micro-benchmarking has shown that starting loop iterator after 0 does
        //not gain any performance benefits, so this getImageData call is
        //the next target for benchmarks.
        let imageData : ImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);             //Get Uint8ClampedArray of pixel data from canvas
        let audioBuffer : AudioBuffer = this.audioContext.createBuffer(1, this.samplesPerFrame, this.samprate);     //Create AudioBuffer to support
        let monoBuffer : Float32Array = audioBuffer.getChannelData(0);                                              //Get single channel buffer from AudioBuffer
        let scaledStart : number;
        let scaledEnd : number;
        let alpha : number;
        let fadeMultiplier : number = 1.0;
        let imageDataWidth : number = imageData.width * 4;
    
        let fadeLengthInSamples : number = 30.0;
        let fadeIncrement : number = 1.0 / fadeLengthInSamples;
        let sample : number = 0;
        let len : number =  audioBuffer.length
        
        for (sample = 0; sample < len; sample++) {
            scaledStart = Math.floor(sample * heightMultiplier);
            scaledEnd   = scaledStart + 1;
            alpha = (sample * heightMultiplier) - scaledStart;
    
            if (sample < fadeLengthInSamples) {
                fadeMultiplier = sample * fadeIncrement;
            } else if (sample >= audioBuffer.length - fadeLengthInSamples) {
                fadeMultiplier = ((audioBuffer.length - 1) - sample) * fadeIncrement;
            } else {
                fadeMultiplier = 1.0;
            }
            monoBuffer[scaledStart] = this.getRowLuminance(imageData.data, imageDataWidth, scaledStart, scaledEnd, alpha) * fadeMultiplier;
        }
        //returns entire audiobuffer, maybe only Float32Array?
        return audioBuffer;
    }
    
    private getRowLuminance (data : Uint8ClampedArray, width : number, scaledStart : number, scaledEnd : number, alpha : number) : number {
        //@ts-ignore state is global
        const locationOfSoundtrack : number = width * state.start; // determines location of optical soundtrack
        let luminance : number = 0;
        let L1 : number;
        let L2 : number;
        let scaledStartWidth : number = scaledStart * width;
        let scaledEndWidth: number = scaledEnd * width;
        // only calculate luma if the current column is within the soundtrack portion of the image
        for (let i : number = 0; i < width; i += 4) {
            // convert the RGB to HSL (we want L)
            if (i < locationOfSoundtrack) continue;
            
            L1 = this.RED_MULTIPLIER * data[scaledStartWidth + i * 4] +  this.GREEN_MULTIPLIER * data[scaledStartWidth + i * 4 + 1] + this.BLUE_MULTIPLIER * data[scaledStartWidth + i * 4 + 2];
            L2  = this.RED_MULTIPLIER * data[scaledEndWidth + i * 4] +  this.GREEN_MULTIPLIER * data[scaledEndWidth + i * 4 + 1] + this.BLUE_MULTIPLIER * data[scaledEndWidth + i * 4 + 2];
            luminance += ( (1 - alpha) * L1 + alpha * L2 )  / 128.0 - 1.0;
        }
        luminance = luminance / (width / 4.0);
        return luminance;
    }
}