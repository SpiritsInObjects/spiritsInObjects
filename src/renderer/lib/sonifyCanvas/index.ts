'use strict';

var framerate = 24;
var samprate = 48000;
var samplesPerFrame = samprate/framerate;

const RED_SCALAR : number = 0.3;
const GREEN_SCALAR : number = 0.59;
const BLUE_SCALAR : number = 0.11;

function sonifyCanvas (audioCtx : AudioContext, canvas : HTMLCanvasElement, ctx : CanvasRenderingContext2D) : AudioBuffer {
    let heightScalar : number = (canvas.height / samplesPerFrame);                          //Ratio of sample size to height of frame
    let imageData : ImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);        //Get Uint8ClampedArray of pixel data from canvas
    let audioBuffer : AudioBuffer = audioCtx.createBuffer(1, samplesPerFrame, samprate);    //Create AudioBuffer to support
    let monoBuffer : Float32Array = audioBuffer.getChannelData(0);                          //Get single channel buffer from AudioBuffer
    let scaledStart : number;
    let scaledEnd : number;
    let alpha : number;
    let fadeMultiplier : number = 1.0;
    let imageDataWidth : number = imageData.width * 4;

    let fadeLengthInSamples = 30.0;
    let fadeIncrement = 1.0 / fadeLengthInSamples;

    for (let sample : number = 0; sample < audioBuffer.length; sample ++) {
        scaledStart = Math.floor(sample * heightScalar);
        scaledEnd   = scaledStart + 1;
        alpha = (sample * heightScalar) - scaledStart;

        if (sample < fadeLengthInSamples) {
            fadeMultiplier = sample * fadeIncrement;
        } else if (sample >= audioBuffer.length - fadeLengthInSamples) {
            fadeMultiplier = ((audioBuffer.length - 1) - sample) * fadeIncrement;
        } else {
            fadeMultiplier = 1.0;
        }
        
        monoBuffer[scaledStart] = getRowLuminance(imageData.data, imageDataWidth, scaledStart, scaledEnd, alpha) * fadeMultiplier;
    }
    return audioBuffer;
}

function getRowLuminance (data : Uint8ClampedArray, width : number, scaledStart : number, scaledEnd : number, alpha : number) : number {
    const locationOfSoundtrack : number = width * 0.72; // determines location of optical soundtrack
    let luminance : number = 0;
    let L1 : number;
    let L2 : number;
    // only calculate luma if the current column is within the soundtrack portion of the image
    for (let i : number = 0; i < width; i += 4) {
        // convert the RGB to HSL (we want L)
        if (i < locationOfSoundtrack) continue;
        
        L1 = RED_SCALAR * data[scaledStart * width + i * 4] +  GREEN_SCALAR * data[scaledStart * width + i * 4 + 1] +  BLUE_SCALAR * data[scaledStart * width + i * 4 + 2];
        L2  = RED_SCALAR * data[scaledEnd * width + i * 4] +  GREEN_SCALAR * data[scaledEnd * width + i * 4 + 1] + BLUE_SCALAR * data[scaledEnd * width + i * 4 + 2];
        luminance += ( (1 - alpha) * L1 + alpha * L2 )  / 128.0 - 1.0;
    }
    luminance = luminance / (width / 4.0);
    return luminance;
}