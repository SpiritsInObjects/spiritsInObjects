'use strict';

import { runInThisContext } from "vm";

/** class representing image sonification of the canvas */
export class SonifyNode {
    private framerate : number = 24;
    private samprate : number = 48000;
    private samplesPerFrame : number = this.samprate / this.framerate;
    private tmp : string;
    private width : number;
    private height : number;
    private start : number;
    private end : number;

    private RED_MULTIPLIER : number = 0.3;
    private GREEN_MULTIPLIER : number = 0.59;
    private BLUE_MULTIPLIER : number = 0.11;

    /**
     * @constructor
     * 
     * Creates Sonify class using a global AudioContext and canvas element
     * 
     * @param {object} state 
     */

    constructor (state : any) {
        this.framerate = state.framerate;
        this.samprate = state.samplerate;
        this.samplesPerFrame = this.samprate / this.framerate;
        this.width = state.width;
        this.height = state.height;
        this.start = state.start;
        this.end = state.end;
    }

    public sonify (imageData : Uint8Array) : Float32Array {
        let monoBuffer : Float32Array = new Float32Array(this.samplesPerFrame);
        let heightMultiplier : number = this.height / this.samplesPerFrame;
        let scaledStart : number;
        let scaledEnd : number;
        let alpha : number;
        let fadeMultiplier : number = 1.0;
        let imageDataWidth : number = this.width * 4;
    
        let fadeLengthInSamples : number = 0;//30.0;
        let fadeIncrement : number = 1.0 / fadeLengthInSamples;
        let sample : number = 0;
        let len : number = monoBuffer.length;

        for (sample = 0; sample < len; sample++) {
            scaledStart = Math.floor(sample * heightMultiplier);
            scaledEnd   = scaledStart + 1;
            alpha = (sample * heightMultiplier) - scaledStart;
    
            if (sample < fadeLengthInSamples) {
                fadeMultiplier = sample * fadeIncrement;
            } else if (sample >= monoBuffer.length - fadeLengthInSamples) {
                fadeMultiplier = ((monoBuffer.length - 1) - sample) * fadeIncrement;
            } else {
                fadeMultiplier = 1.0;
            }
            monoBuffer[scaledStart] = this.getRowLuminance(imageData, imageDataWidth, scaledStart, scaledEnd, alpha) * fadeMultiplier;
        }
        return monoBuffer;
    }
    
    private getRowLuminance (data : Uint8Array, width : number, scaledStart : number, scaledEnd : number, alpha : number) : number {
        //@ts-ignore state is global
        const locationOfSoundtrack : number = width * this.start; // determines location of optical soundtrack
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

module.exports.SonifyNode = SonifyNode;