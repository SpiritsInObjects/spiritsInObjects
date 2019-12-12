'use strict';

/** class representing image sonification of the canvas */
class Sonify {
    private audioContext : AudioContext;
    private canvas : HTMLCanvasElement;
    private ctx : CanvasRenderingContext2D;
    private framerate = 24;
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
        let heightMultiplier : number = (this.canvas.height / this.samplesPerFrame);                          //Ratio of sample size to height of frame
        let imageData : ImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);        //Get Uint8ClampedArray of pixel data from canvas
        let audioBuffer : AudioBuffer = this.audioContext.createBuffer(1, this.samplesPerFrame, this.samprate);    //Create AudioBuffer to support
        let monoBuffer : Float32Array = audioBuffer.getChannelData(0);                          //Get single channel buffer from AudioBuffer
        let scaledStart : number;
        let scaledEnd : number;
        let alpha : number;
        let fadeMultiplier : number = 1.0;
        let imageDataWidth : number = imageData.width * 4;
    
        let fadeLengthInSamples = 30.0;
        let fadeIncrement = 1.0 / fadeLengthInSamples;
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
        return audioBuffer;
    }
    
    private getRowLuminance (data : Uint8ClampedArray, width : number, scaledStart : number, scaledEnd : number, alpha : number) : number {
        //@ts-ignore
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