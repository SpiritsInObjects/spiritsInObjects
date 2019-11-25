'use strict';
var framerate = 24;
var samprate = 48000;
var samplesPerFrame = samprate / framerate;
const RED_MULTIPLIER = 0.3;
const GREEN_MULTIPLIER = 0.59;
const BLUE_MULTIPLIER = 0.11;
function sonifyCanvas(audioCtx, canvas, ctx) {
    let heightMultiplier = (canvas.height / samplesPerFrame); //Ratio of sample size to height of frame
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height); //Get Uint8ClampedArray of pixel data from canvas
    let audioBuffer = audioCtx.createBuffer(1, samplesPerFrame, samprate); //Create AudioBuffer to support
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
        monoBuffer[scaledStart] = getRowLuminance(imageData.data, imageDataWidth, scaledStart, scaledEnd, alpha) * fadeMultiplier;
    }
    return audioBuffer;
}
function getRowLuminance(data, width, scaledStart, scaledEnd, alpha) {
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
        L1 = RED_MULTIPLIER * data[scaledStartWidth + i * 4] + GREEN_MULTIPLIER * data[scaledStartWidth + i * 4 + 1] + BLUE_MULTIPLIER * data[scaledStartWidth + i * 4 + 2];
        L2 = RED_MULTIPLIER * data[scaledEndWidth + i * 4] + GREEN_MULTIPLIER * data[scaledEndWidth + i * 4 + 1] + BLUE_MULTIPLIER * data[scaledEndWidth + i * 4 + 2];
        luminance += ((1 - alpha) * L1 + alpha * L2) / 128.0 - 1.0;
    }
    luminance = luminance / (width / 4.0);
    return luminance;
}
