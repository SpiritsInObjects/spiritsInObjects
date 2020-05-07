'use strict';

/** class representing image sonification of the canvas */
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
     * Creates Sonify class using a global AudioContext and canvas element
     * 
     * @param audioContext 
     * @param canvas 
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

    public sonifyCanvas () : Float32Array {
        let image : ImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);  
        return this.sonify(image.data);
    }

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

    private brightness (r : number, g : number, b : number) : number {
        return (this.RED_MULTIPLIER * r) + (this.GREEN_MULTIPLIER * g) + (this.BLUE_MULTIPLIER * b);
    }

    private map_range (value : number, low1 : number, high1 : number, low2 : number, high2 : number) : number {
        return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
    }
    
    private getSample (row : Uint8ClampedArray) : number {
        let luminance : number = 0;
        for (let i : number = 0; i < row.length; i += 4) {
            if (i < this.startLocation || i > this.endLocation) continue;
            luminance += this.brightness(row[i], row[i + 1], row[i + 2]);
        }
        return this.map_range(luminance, 0, this.max, -0.999999, 0.999999);
    }
}

if (typeof module !== 'undefined') {
    module.exports = Sonify
}