'use strict';

/** class representing image sonification of a canvas element */
class Sonify {
    private canvas : HTMLCanvasElement;
    private ctx : CanvasRenderingContext2D;
    private framerate : number = 24;
    private samplerate : number = 48000;
    private samplesPerFrame : number = this.samplerate / this.framerate;
    private start : number = 0.72;
    private end  : number = 1.0;
    private height : number;
    private width : number;
    private startLocation : number;
    private endLocation : number;
    private max : number; 

    private RED_MULTIPLIER : number = 0.3;
    private GREEN_MULTIPLIER : number = 0.59;
    private BLUE_MULTIPLIER : number = 0.11;

    /**
     * @constructor
     * 
     * Creates Sonify class using a canvas element
     * 
     * @param {Object} state  State object containing video information
     * @param {Object} canvas Canvas to sonify
     */

    constructor (state : any, canvas : HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');

        if (state.get('framerate')) this.framerate = state.get('framerate');
        if (state.get('start')) this.start = state.get('start');
        if (state.get('end')) this.end = state.get('end');

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
    public sonifyCanvas () : Float32Array {
        let image : ImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);  
        return this.sonify(image.data);
    }

    /**
     * Sonify pixel data stored in an rgba array [r, g, b, a] = 1px
     * 
     * @param {array} imageData Pixel data stored in typed uint8 clamped array
     * 
     * @returns {array} Sound data as typed float32 array
     */
    public sonify (imageData : Uint8ClampedArray) : Float32Array {
        const monoBuffer : Float32Array = new Float32Array(this.samplesPerFrame);
        let i : number = 0;
        let row : Uint8ClampedArray;
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
     */
    private map_range (value : number, low1 : number, high1 : number, low2 : number, high2 : number) : number {
        return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
    }
    
    /**
     * Turn a row of image data into a single audio sample
     * 
     * @param {array} row Single row of image (1px section across width)
     */
    private getSample (row : Uint8ClampedArray) : number {
        let luminance : number = 0;
        for (let i : number = 0; i < row.length; i += 4) {
            if (i < this.startLocation || i > this.endLocation) continue;
            luminance += this.brightness(row[i], row[i + 1], row[i + 2]);
        }
        return this.map_range(luminance, 0, this.max, -0.999999, 0.999999);
    }

    /**
     * Fade an array of sample data in and out by n samples
     * 
     * @param {array} original Audio sample data to fade
     * @param {number} fadeLen Length of fades in sample
     */
    public fade (original : Float32Array, fadeLen : number = 30) : Float32Array {
        const len : number = original.length;
        for (let i = 0; i < len; i++) {
            if (i < fadeLen) {
                original[i] = original[i] * (i / fadeLen);
            } else if (i > len - fadeLen) {
                original[i] = original[i] * ( (len - i) / fadeLen);
            }
        }
        return original;
    }
}

if (typeof module !== 'undefined') {
    module.exports = Sonify
}