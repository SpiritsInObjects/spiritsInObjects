'use strict'

var audioCtx;
var framerate = 24;
var samprate = 48000;
var samplesPerFrame = samprate/framerate;
var fadeMultiplier = 1.0;
var source;
var sonify;
var buf;
var mono;
var tmp;

var makeABuffer = function(can01, ctx01) {
	var img_can = can01;
	var img_ctx = ctx01;
	var img_data = img_ctx.getImageData(0, 0, img_can.width, img_can.height);
	var myArrayBuffer = audioCtx.createBuffer(1, samplesPerFrame, samprate); //holds image to sound data
	
	//fade variables
	var fadeLengthInSamples = 30.0;
	var fadeIncrement = 1.0 / fadeLengthInSamples;
	
	var row_increment = (img_can.height/samplesPerFrame); //find ratio of vertical pixels to length of audio buffer
	var nowBuffering = myArrayBuffer.getChannelData(0);
	for (var sample_i = 0; sample_i < myArrayBuffer.length; sample_i ++) {
		var row_i = Math.floor(sample_i * row_increment);
		var row_j = Math.ceil(sample_i * row_increment);
		// var alpha = row_j - (sample_i * row_increment); //parag
		var alpha = (sample_i * row_increment) - row_i; // andy
		
		//calculates a multiplier to apply fades to each audio buffer...should not be over a large amount of samples since optical track isn't exactly perfect`
		if (sample_i < fadeLengthInSamples) {
			fadeMultiplier = sample_i * fadeIncrement;
		} else if (sample_i >= myArrayBuffer.length - fadeLengthInSamples) {
			fadeMultiplier = ((myArrayBuffer.length - 1) - sample_i) * fadeIncrement;
		} else {
			fadeMultiplier = 1.0;
		}
		
		//gets average interpolated luma value for each row and scales it between 1 & -1
		nowBuffering[sample_i] = getInterpolatedLuminanceForImage(img_data.data, img_data.width*4, row_i, row_j, alpha) * fadeMultiplier;
	}

	return myArrayBuffer;
}

var getInterpolatedLuminanceForImage = function(dat, imgwidth, row_i, row_j, alpha) {
	var L = 0;
	var locationOfSoundtrack = imgwidth * 0.72; // determines location of optical soundtrack
	for (var col_i = 0; col_i < imgwidth; col_i += 4) {
		// only calculate luma if the current column is within the soundtrack portion of the image
		if (col_i >= locationOfSoundtrack) {
			// convert the RGB to HSL (we want L)
			var L1 = 0.3 * dat[row_i * imgwidth + col_i * 4] +  0.59 * dat[row_i * imgwidth + col_i * 4 + 1] + dat[row_i * imgwidth + col_i * 4 + 2] * 0.11;
			var L2  = 0.3 * dat[row_j * imgwidth + col_i * 4] +  0.59 * dat[row_j * imgwidth + col_i * 4 + 1] + dat[row_j * imgwidth + col_i * 4 + 2] * 0.11;
			L += ( (1 - alpha) * L1 + alpha * L2 )  / 128.0 - 1.0;
		}
	}
	L = L / (imgwidth / 4.0);
	return L;
}

function Test1() {
	var canvas = document.getElementById('canvas');
	var state = {
		framerate : 24
	}
    if (canvas.getContext) {
        var ctx = canvas.getContext('2d');
        var img1 = new Image();
        //img1.crossOrigin = "Anonymous";
        img1.src = PROFILE_DATA;
        img1.onload = function () {
			console.log('Ready')
			ctx.drawImage(img1, 0, 0);
        };
	} 
	canvas.onclick = function () {
		
		setTimeout(function () {
			console.time('original')
			makeABuffer(canvas, ctx)
			console.timeEnd('original')
		}, 2000)

		setTimeout(function () {
			audioCtx = new AudioContext();
			source = audioCtx.createBufferSource()
			buf = audioCtx.createBuffer(1, 720, 720 * 24);
			mono = buf.getChannelData(0)
			sonify = new Sonify(state, canvas)
			
			console.time('new')
			tmp = sonify.sonifyCanvas()
			console.timeEnd('new')

			mono.set(tmp, 0);
	
			console.dir(mono)
			source.buffer = buf;
			source.connect(audioCtx.destination)
			
			source.start();
		}, 1000)

		var audioCtx2 = new (window.AudioContext || window.webkitAudioContext)();

		// Create an empty three-second stereo buffer at the sample rate of the AudioContext
		var myArrayBuffer = audioCtx2.createBuffer(1, audioCtx2.sampleRate * 3, audioCtx2.sampleRate);

		// Fill the buffer with white noise;
		// just random values between -1.0 and 1.0
		for (var channel = 0; channel < myArrayBuffer.numberOfChannels; channel++) {
			// This gives us the actual array that contains the data
			var nowBuffering = myArrayBuffer.getChannelData(channel);
			for (var i = 0; i < myArrayBuffer.length; i++) {
				// Math.random() is in [0; 1.0]
				// audio needs to be in [-1.0; 1.0]
				nowBuffering[i] = Math.random() * 2 - 1;
			}
		}

		// Get an AudioBufferSourceNode.
		// This is the AudioNode to use when we want to play an AudioBuffer
		var source = audioCtx2.createBufferSource();

		// set the buffer in the AudioBufferSourceNode
		source.buffer = myArrayBuffer;

		// connect the AudioBufferSourceNode to the
		// destination so we can hear the sound
		source.connect(audioCtx2.destination);

		// start the source playing
		//source.start();
	}               
}

(function () {
    Test1();
})()