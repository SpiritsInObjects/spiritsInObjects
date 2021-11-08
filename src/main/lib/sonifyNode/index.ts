'use strict';

export class SonifyNode {
    private framerate : number = 24;
    private samplerate : number = 48000;
    private samplesPerFrame : number = this.samplerate / this.framerate;
    private tmp : string; //
    private width : number;
    private height : number; //
    private start : number;
    private end : number; //

    private startLocation : number;
    private endLocation : number;
    private max : number;

    private RED_MULTIPLIER : number = 0.3;
    private GREEN_MULTIPLIER : number = 0.59;
    private BLUE_MULTIPLIER : number = 0.11;

    /**
     * @constructor
     * 
     * Creates Sonify class using a global AudioContext and canvas element
     * 
     * @param {object} state     State contains all settings which can be passed to class
     */
    constructor (state : any) {
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
    public sonify (imageData : Uint8Array) : Float32Array {
        const monoBuffer : Float32Array = new Float32Array(this.samplesPerFrame);
        let i : number = 0;
        let row : Uint8Array;

        for (i = 0; i < this.samplesPerFrame; i++) {
            row = imageData.subarray(this.width * i * 4, this.width * (i + 1) * 4);
            monoBuffer[i] = this.getSample( row );
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
    private brightness (r : number, g : number, b : number) : number {
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
    private map_range (value : number, low1 : number, high1 : number, low2 : number, high2 : number) : number {
        return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
    }

    /**
     * Turn a row of image data into a single audio sample
     * 
     * @param {array} row Single row of image (1px section across width)
     * 
     * @returns {number} Mapped total value of row
     */
    private getSample (row : Uint8Array) : number {
        let luminance : number = 0;
        for (let i : number = 0; i < row.length; i += 4) {
            if (i < this.startLocation || i > this.endLocation) continue;
            luminance += this.brightness(row[i], row[i + 1], row[i + 2]);
        }
        return this.map_range(luminance, 0, this.max, -0.999999, 0.999999);
    }
}

module.exports.SonifyNode = SonifyNode;