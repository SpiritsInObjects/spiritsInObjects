'use strict';
const epromptRaw = require('electron-prompt');
//var gui = require('nw.gui');
var fs = require('fs'); //node.js filesystem
var path = require('path');
// buffer and sound variables
var audioCtx = new AudioContext();
var framerate = 24;
var samprate = 48000;
var samplesPerFrame = samprate / framerate;
var gainNode = audioCtx.createGain();
var bufferArray = new Array();
var totalFrameCount = 0;
var masterBuffer;
var timelineArray = new Array();
var timelineCanvasArray = new Array();
// image and drawing variables
var canSonArray = new Array();
var canSonFiles = new Array();
var myCanvasArray = new Array();
// gui variables
var buttons = new Array();
var buttonImages = new Array();
var sliderMax = 12;
var sliderMin = 0;
var fadeMultiplier = 1.0;
async function eprompt(message) {
    return epromptRaw({ title: 'spiritsInObjects', label: message });
}
var getTotalFrameCountOfSoundtrack = function (totalFrameCount01) {
    totalFrameCount = totalFrameCount01;
    masterBuffer = audioCtx.createBuffer(1, samplesPerFrame * totalFrameCount, samprate);
    timelineArray.length = parseInt(totalFrameCount);
    for (var i = 0; i < timelineArray.length; i++) {
        timelineArray[i] = 0;
    }
};
var loadingObjects = async function (el) {
    const fileUploadElem = document.getElementById('fileUpload');
    const files = fileUploadElem.files;
    if (files && files[0]) {
        for (var i = 0; i < files.length; i++) {
            if (i <= 0) {
                // do all of the canvas drawing/sonification stuff here for the gray frame
                var k = 0;
                myCanvasArray[k] = document.createElement("canvas");
                myCanvasArray[k].id = "mycanvas-" + k;
                document.getElementById('canvases').appendChild(myCanvasArray[k]);
                buttons[k] = document.createElement("button");
                buttons[k].id = "button-" + k;
                document.getElementById("imagebuttons").appendChild(buttons[k]);
                $('#imagebuttons').css('zoom', 0.15);
                var can = $("#mycanvas-" + k)[0];
                var ctx = can.getContext("2d");
                var currentButton = $("#button-" + k)[0];
                can.height = 1080;
                can.width = 1920;
                ctx.rect(0, 0, 1920, 1080);
                ctx.fillStyle = "rgb(128, 128, 128)";
                ctx.fill();
                document.getElementById("canvases").style.display = "none";
                bufferArray[k] = makeABuffer(can, ctx);
                buttonImages[k] = document.createElement("img");
                buttonImages[k].id = "buttonImage-" + k;
                var can2 = document.getElementById("mycanvas-" + k);
                buttonImages[k].src = can2.toDataURL();
                document.getElementById("button-" + k).appendChild(buttonImages[k]);
                currentButton.addEventListener('click', async function () {
                    var userFrameLocationRaw = await eprompt('When do you want me to sound? (frame number)');
                    var userFrameLocation = parseInt(userFrameLocationRaw);
                    var frameLocation = Math.min(Math.max(userFrameLocation, 0), totalFrameCount);
                    var audioLocationInSamples = Math.round(samplesPerFrame * frameLocation);
                    var userSoundLengthInFramesRaw = await eprompt('How long should I sound? (in frames)');
                    var userSoundLengthInFrames = parseInt(userSoundLengthInFramesRaw);
                    var soundLengthInFrames = Math.min(Math.max(userSoundLengthInFrames, 0), (totalFrameCount - frameLocation));
                    var totalSamplesInSound = Math.round(soundLengthInFrames * samplesPerFrame);
                    var masterBufferData = masterBuffer.getChannelData(0);
                    var framesAudioData = bufferArray[k].getChannelData(0);
                    var repeatYesNo = await eprompt('Should I repeat? (1 for yes, 0 for no');
                    let rep_h;
                    let rep_j;
                    let rep_i;
                    if (repeatYesNo == '1') {
                        var repeatIntervalInFramesRaw = await eprompt('How many frames between each repetition?');
                        var repeatIntervalInFrames = parseInt(repeatIntervalInFramesRaw);
                        var repeatIntervalInSamples = Math.round(samplesPerFrame * repeatIntervalInFrames);
                        var userRepeatAmountRaw = await eprompt('How many times should I play?');
                        var userRepeatAmount = parseInt(userRepeatAmountRaw);
                        var repeatAmount = Math.min(Math.max(userRepeatAmount, 0), (totalFrameCount / repeatIntervalInFrames));
                        var repeatLocationInFrames = 0;
                        var repeatLocationInSamples = 0;
                        // insert sample data into master soundtrack buffer
                        // for every total repetition possible, we insert a frame's audio data into the master soundtrack buffer
                        for (rep_h = 0; rep_h < repeatAmount; rep_h++) {
                            repeatLocationInSamples = repeatIntervalInSamples * rep_h;
                            if (repeatLocationInSamples > masterBufferData.length - totalSamplesInSound) {
                                break;
                            }
                            for (rep_i = 0; rep_i < totalSamplesInSound; rep_i++) {
                                masterBufferData[(audioLocationInSamples + repeatLocationInSamples) + rep_i] = framesAudioData[rep_i % Math.floor(samplesPerFrame)];
                            }
                            // define array that stores image numbers for use in timeline
                            repeatLocationInFrames = repeatIntervalInFrames * rep_h;
                            for (rep_j = 0; rep_j < soundLengthInFrames; rep_j++) {
                                if (frameLocation + repeatLocationInFrames + rep_j >= totalFrameCount) {
                                    break;
                                }
                                timelineArray[(frameLocation + repeatLocationInFrames) + rep_j] = k;
                            }
                            let timelineRangeStart = $('timelineRangeStart').val();
                            let timelineRangeEnd = $('timelineRangeEnd').val();
                            let zoomSlider = $('#zoomSlider').val();
                            showSoundtrackTimeline(timelineRangeStart, timelineRangeEnd, zoomSlider);
                        }
                    }
                    else {
                        for (rep_i = 0; rep_i < totalSamplesInSound; rep_i++) {
                            masterBufferData[audioLocationInSamples + rep_i] = framesAudioData[rep_i % Math.floor(samplesPerFrame)];
                        }
                        // define array that stores image numbers for use in timeline
                        for (rep_j = 0; rep_j < parseInt(soundLengthInFrames); rep_j++) {
                            timelineArray[parseInt(frameLocation) + rep_j] = k;
                        }
                        let timelineRangeStart = $('timelineRangeStart').val();
                        let timelineRangeEnd = $('timelineRangeEnd').val();
                        let zoomSlider = $('#zoomSlider').val();
                        showSoundtrackTimeline(timelineRangeStart, timelineRangeEnd, zoomSlider);
                    }
                }, false);
            }
            canSonFiles[i] = el.files[i];
            canSonArray[i] = new canSon(i + 1);
            canSonArray[i].readFile(canSonFiles[i]);
        }
    }
    for (var can_i = 0; can_i < totalFrameCount; can_i++) {
        // if (document.getElementById('timeline').childElementCount <= framerate + 1) {
        timelineCanvasArray[can_i] = document.createElement("canvas");
        timelineCanvasArray[can_i].id = "canvasForTimeline" + (can_i);
        document.getElementById('timeline').appendChild(timelineCanvasArray[can_i]);
        // }
        var timelineCan = $("#canvasForTimeline" + can_i)[0];
        timelineCan.style.border = "black 1px solid";
        var timelinectx = timelineCan.getContext("2d");
        timelineCan.height = 1080 * 0.15;
        timelineCan.width = 1920 * 0.15;
    }
    sliderMax = parseInt(totalFrameCount);
    var timelineRangeStartElem = document.getElementById('timelineRangeStart');
    var timelineRangeEndElem = document.getElementById('timelineRangeEnd');
    timelineRangeStartElem.max = `${sliderMax}`;
    timelineRangeEndElem.max = `${sliderMax}`;
    timelineRangeStartElem.min = `${sliderMin}`;
    timelineRangeEndElem.min = `${sliderMin}`;
};
// canvas sonification object constructor
class canSon {
    constructor(inum01) {
        this.img = new Image();
        this.inum = inum01;
        myCanvasArray[this.inum] = document.createElement("canvas");
        myCanvasArray[this.inum].id = "mycanvas-" + this.inum;
        document.getElementById('canvases').appendChild(myCanvasArray[this.inum]);
        buttons[this.inum] = document.createElement("button");
        buttons[this.inum].id = "button-" + this.inum;
        document.getElementById("imagebuttons").appendChild(buttons[this.inum]);
        $('#imagebuttons').css('zoom', 0.15);
        this.can = $("#mycanvas-" + this.inum)[0];
        this.ctx = this.can.getContext("2d");
        var currentButton = $("#button-" + this.inum)[0];
        // click a canvas to hear its image
        this.can.addEventListener('click', function () {
            makeASound(bufferArray[this.inum]);
        }.bind(this), false);
        // click a button to sequence the image within a master buffer
        currentButton.addEventListener('click', async function () {
            var userFrameLocation = parseInt(await eprompt('When do you want me to sound? (frame number)'));
            var frameLocation = Math.min(Math.max(userFrameLocation, 0), totalFrameCount);
            var audioLocationInSamples = Math.round(samplesPerFrame * frameLocation);
            var userSoundLengthInFrames = parseInt(await eprompt('How long should I sound? (in frames)'));
            var soundLengthInFrames = Math.min(Math.max(userSoundLengthInFrames, 0), (totalFrameCount - frameLocation));
            var totalSamplesInSound = Math.round(soundLengthInFrames * samplesPerFrame);
            var masterBufferData = masterBuffer.getChannelData(0);
            var framesAudioData = bufferArray[this.inum].getChannelData(0);
            var repeatYesNo = await eprompt('Should I repeat? (1 for yes, 0 for no)');
            let rep_i;
            let rep_j;
            let rep_h;
            if (repeatYesNo == 1) {
                var repeatIntervalInFrames = parseInt(await eprompt('How many frames between each repetition?'));
                var repeatIntervalInSamples = Math.round(samplesPerFrame * repeatIntervalInFrames);
                var userRepeatAmount = parseInt(await eprompt('How many times should I play?'));
                var repeatAmount = Math.min(Math.max(userRepeatAmount, 0), (totalFrameCount / repeatIntervalInFrames));
                var repeatLocationInFrames = 0;
                var repeatLocationInSamples = 0;
                // insert sample data into master soundtrack buffer
                // for every total repetition possible, we insert a frame's audio data into the master soundtrack buffer
                for (rep_h = 0; rep_h < repeatAmount; rep_h++) {
                    repeatLocationInSamples = repeatIntervalInSamples * rep_h;
                    if (repeatLocationInSamples > masterBufferData.length - totalSamplesInSound) {
                        break;
                    }
                    for (rep_i = 0; rep_i < totalSamplesInSound; rep_i++) {
                        masterBufferData[(audioLocationInSamples + repeatLocationInSamples) + rep_i] = framesAudioData[rep_i % Math.floor(samplesPerFrame)];
                    }
                    // define array that stores image numbers for use in timeline
                    repeatLocationInFrames = repeatIntervalInFrames * rep_h;
                    for (rep_j = 0; rep_j < soundLengthInFrames; rep_j++) {
                        if (frameLocation + repeatLocationInFrames + rep_j >= totalFrameCount) {
                            break;
                        }
                        timelineArray[(frameLocation + repeatLocationInFrames) + rep_j] = this.inum;
                    }
                    let timelineRangeStart = $('timelineRangeStart').val();
                    let timelineRangeEnd = $('timelineRangeEnd').val();
                    let zoomSlider = $('#zoomSlider').val();
                    showSoundtrackTimeline(timelineRangeStart, timelineRangeEnd, zoomSlider);
                }
            }
            else {
                for (rep_i = 0; rep_i < totalSamplesInSound; rep_i++) {
                    masterBufferData[audioLocationInSamples + rep_i] = framesAudioData[rep_i % Math.floor(samplesPerFrame)];
                }
                // define array that stores image numbers for use in timeline
                for (rep_j = 0; rep_j < parseInt(soundLengthInFrames); rep_j++) {
                    timelineArray[parseInt(frameLocation) + rep_j] = this.inum;
                }
                let timelineRangeStart = $('timelineRangeStart').val();
                let timelineRangeEnd = $('timelineRangeEnd').val();
                let zoomSlider = $('#zoomSlider').val();
                showSoundtrackTimeline(timelineRangeStart, timelineRangeEnd, zoomSlider);
            }
        }.bind(this), false);
    }
    readFile(e2) {
        var filename01 = e2;
        var fr = new FileReader();
        fr.onload = this.imageHandler.bind(this);
        fr.readAsDataURL(filename01);
    }
    imageHandler(e3) {
        this.img.src = e3.target.result;
        this.img.onload = function () {
            this.can.height = this.img.height;
            this.can.width = this.img.width;
            this.ctx.drawImage(this.img, 0, 0);
            document.getElementById("canvases").style.display = "none";
            bufferArray[this.inum] = makeABuffer(this.can, this.ctx);
            buttonImages[this.inum] = document.createElement("img");
            buttonImages[this.inum].id = "buttonImage-" + this.inum;
            buttonImages[this.inum].src = this.img.src;
            document.getElementById("button-" + this.inum).appendChild(buttonImages[this.inum]);
            // popup button creation 
            //document.getElementById("popupImage01").src = img.src;
        };
    }
}
var makeABuffer = function (can01, ctx01) {
    var img_can = can01;
    var img_ctx = ctx01;
    var img_data = img_ctx.getImageData(0, 0, img_can.width, img_can.height);
    var myArrayBuffer = audioCtx.createBuffer(1, samplesPerFrame, samprate); //holds image to sound data
    //fade variables
    var fadeLengthInSamples = 30.0;
    var fadeIncrement = 1.0 / fadeLengthInSamples;
    var row_increment = (img_can.height / samplesPerFrame); //find ratio of vertical pixels to length of audio buffer
    var nowBuffering = myArrayBuffer.getChannelData(0);
    for (var sample_i = 0; sample_i < myArrayBuffer.length; sample_i++) {
        var row_i = Math.floor(sample_i * row_increment);
        var row_j = Math.ceil(sample_i * row_increment);
        // var alpha = row_j - (sample_i * row_increment); //parag
        var alpha = (sample_i * row_increment) - row_i; // andy
        //calculates a multiplier to apply fades to each audio buffer...should not be over a large amount of samples since optical track isn't exactly perfect`
        if (sample_i < fadeLengthInSamples) {
            fadeMultiplier = sample_i * fadeIncrement;
        }
        else if (sample_i >= myArrayBuffer.length - fadeLengthInSamples) {
            fadeMultiplier = ((myArrayBuffer.length - 1) - sample_i) * fadeIncrement;
        }
        else {
            fadeMultiplier = 1.0;
        }
        //gets average interpolated luma value for each row and scales it between 1 & -1
        nowBuffering[sample_i] = getInterpolatedLuminanceForImage(img_data.data, img_data.width * 4, row_i, row_j, alpha) * fadeMultiplier;
    }
    return myArrayBuffer;
};
var getInterpolatedLuminanceForImage = function (dat, imgwidth, row_i, row_j, alpha) {
    var L = 0;
    var locationOfSoundtrack = imgwidth * 0.72; // determines location of optical soundtrack
    for (var col_i = 0; col_i < imgwidth; col_i += 4) {
        // only calculate luma if the current column is within the soundtrack portion of the image
        if (col_i >= locationOfSoundtrack) {
            // convert the RGB to HSL (we want L)
            var L1 = 0.3 * dat[row_i * imgwidth + col_i * 4] + 0.59 * dat[row_i * imgwidth + col_i * 4 + 1] + dat[row_i * imgwidth + col_i * 4 + 2] * 0.11;
            var L2 = 0.3 * dat[row_j * imgwidth + col_i * 4] + 0.59 * dat[row_j * imgwidth + col_i * 4 + 1] + dat[row_j * imgwidth + col_i * 4 + 2] * 0.11;
            L += ((1 - alpha) * L1 + alpha * L2) / 128.0 - 1.0;
        }
    }
    L = L / (imgwidth / 4.0);
    return L;
};
var makeASound = function (buffer01) {
    var currentBuffer = buffer01;
    var source01 = audioCtx.createBufferSource(); //actual audio buffer
    source01.buffer = currentBuffer;
    source01.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    gainNode.gain.value = 1;
    source01.connect(audioCtx.destination);
    source01.start();
};
var makeASound02 = async function (buffer01) {
    var currentBuffer = buffer01;
    var bufferLocationInFrames = await eprompt('Play soundtrack from frame #:');
    var bufferLocationInSeconds = bufferLocationInFrames / framerate;
    var bufferTotalInSeconds = totalFrameCount / 24;
    var source01 = audioCtx.createBufferSource(); //actual audio buffer
    source01.buffer = currentBuffer;
    source01.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    gainNode.gain.value = 1;
    source01.connect(audioCtx.destination);
    source01.start(0, bufferLocationInSeconds, bufferTotalInSeconds);
};
// begin timeline stuff
var showSoundtrackTimeline = function (sliderValueStart, sliderValueEnd, zoomSliderValue) {
    //***** need to make x number of canvases here to display timeline images pending the interactions with some gui object ***********
    var timelineStart = parseInt(sliderValueStart);
    var timelineEnd = parseInt(sliderValueEnd);
    var totalTimelineDisplay = timelineEnd - timelineStart;
    console.log(timelineStart);
    for (var can_i = 0; can_i < totalTimelineDisplay; can_i++) {
        var timeline_i = can_i + timelineStart;
        var timelineCan = $("#canvasForTimeline" + timeline_i)[0];
        var timelinectx = timelineCan.getContext("2d");
        timelineCan.height = 1080 * 0.15;
        timelineCan.width = 1920 * 0.15;
        timelinectx.scale(0.15, 0.15);
        timelinectx.drawImage(myCanvasArray[timelineArray[can_i + timelineStart]], 0, 0);
        timelinectx.font = "200px Verdana";
        timelinectx.fillStyle = "black";
        timelinectx.fillText(can_i + timelineStart + '', 2, 210);
    }
    for (var can_j = 0; can_j <= totalFrameCount - 1; can_j++) {
        if (can_j >= timelineStart && can_j <= timelineEnd) {
            document.getElementById("canvasForTimeline" + can_j).style.display = "initial";
        }
        else {
            document.getElementById("canvasForTimeline" + can_j).style.display = "none";
        }
    }
    var zoomAmount = zoomSliderValue;
    document.getElementById("timeline").style.zoom = zoomAmount;
};
// end timeline stuff
// begin keyboard stuff
var keysForBuffers = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 113, 119, 101, 114, 116, 121, 117, 105, 111, 112, 97, 115, 100, 102, 103, 104, 106, 107, 108, 59, 122, 120, 99, 118, 98, 110, 109, 44, 46, 47];
var buttonZooming = 0.15;
var buttonZoomAmount = 0.9;
var onKeypress = function (e) {
    var keycode = e.keyCode || e.which;
    for (var key_i = 0; key_i < keysForBuffers.length; key_i++) {
        if (keycode == keysForBuffers[key_i]) {
            makeASound(bufferArray[key_i]);
            break;
        }
    }
    if (keycode == 43) {
        buttonZooming /= buttonZoomAmount;
        document.getElementById("imagebuttons").style.zoom = `${buttonZooming}`;
    }
    else if (keycode == 45) {
        buttonZooming *= buttonZoomAmount;
        document.getElementById("imagebuttons").style.zoom = `${buttonZooming}`;
    }
    else if (keycode == 32) {
        makeASound02(masterBuffer);
    }
};
// end keyboard stuff
// generating the aftereffects expressions script...still undecided whether to generate the code in application or create a separate text file...this does both anyways
var afterEffectsScript = document.createElement("p");
var createTextFile = function () {
    var arraySequenceText = "";
    for (var i = 0; i < timelineArray.length; i++) {
        if (i < timelineArray.length - 1) {
            arraySequenceText += timelineArray[i] + ", ";
        }
        else if (i == timelineArray.length - 1) {
            arraySequenceText += timelineArray[i];
        }
    }
    // AfterEffects expressions script for sequencing a set of images
    // this is the text file version...only difference is in syntax for line breaks
    var textForTextFile = "fr = 24; // framerate" + "\n" + "seg = Math.floor(time*fr); // total length of sequence (in frames)" + "\n" + "f = 0; // playback location" + "\n" + "myImageArray = [" + arraySequenceText + "]; // array of image values" + "\n" + "\n" + "// for-loop that goes through the array in a loop" + "\n" + "for (i = 0; i < seg; i++) {" + "\n" + "f = myImageArray[i % " + timelineArray.length + "]; // modulo operator just for looping and staying within bounds of the length of myImageArray" + "\n" + "}" + "\n" + "framesToTime(f); // sends image to timeline";
    var myDirectory = process.execPath;
    var directoryName = path.dirname(myDirectory);
    console.log(directoryName);
    console.log(textForTextFile);
    fs.writeFile(directoryName + "/AEscriptFromImageToSoundApp.txt", textForTextFile, function (err) {
        if (err) {
            alert("error");
            console.log(err);
        }
    });
    //this is the html version of the script...only difference is in syntax for line breaks
    var htmlTextForTextFile = "fr = 24; // framerate" + "<br>" + "seg = Math.floor(time*fr); // total length of sequence (in frames)" + "<br>" + "f = 0; // playback location" + "<br>" + "myImageArray = [" + arraySequenceText + "]; // array of image values" + "<br>" + "<br>" + "// for-loop that goes through the array in a loop" + "<br>" + "for (i = 0; i < seg; i++) {" + "<br>" + "f = myImageArray[i % " + timelineArray.length + "]; // modulo operator just for looping and staying within bounds of the length of myImageArray" + "<br>" + "}" + "<br>" + "framesToTime(f); // sends image to timeline";
    if (document.getElementById('scriptLocation').childElementCount < 2) {
        afterEffectsScript.id = "aftereffectsscript";
        afterEffectsScript.innerHTML = htmlTextForTextFile;
        document.getElementById('scriptLocation').appendChild(afterEffectsScript);
        document.getElementById('aftereffectsscript').style.font = "12px Verdana";
    }
    else {
        afterEffectsScript.innerHTML = htmlTextForTextFile;
    }
};
// start nw-contextmenu
/*$(function() {
  function Menu(cutLabel, copyLabel, pasteLabel) {
    var gui = require('nw.gui')
      , menu = new gui.Menu()

      , cut = new gui.MenuItem({
        label: cutLabel || "Cut"
        , click: function() {
          document.execCommand("cut");
        }
      })

      , copy = new gui.MenuItem({
        label: copyLabel || "Copy"
        , click: function() {
          document.execCommand("copy");
        }
      })

      , paste = new gui.MenuItem({
        label: pasteLabel || "Paste"
        , click: function() {
          document.execCommand("paste");
        }
      })
    ;

    menu.append(cut);
    menu.append(copy);
    menu.append(paste);

    return menu;
  }

  var menu = new Menu(); //pass cut, copy, paste labels if you need i18n
  $(document).on("contextmenu", function(e) {
    e.preventDefault();
    menu.popup(e.originalEvent.x, e.originalEvent.y);
  });
});*/
// end nw-contextmenu
// function for handling imported aftereffects script and creating a sequence from past scripts....string parsing/formatting stuff
var importAfterEffectsScript = function (scriptImportText) {
    // get text from previous sequence
    var pastedScript = scriptImportText;
    // find beginning of previous script's timeline
    var arrayStartPosition = pastedScript.indexOf("[") + 1;
    // find ending of previous script's timeline
    var arrayEndPosition = pastedScript.indexOf("]");
    // find timeline string length
    var arrayLengthInString = arrayEndPosition - arrayStartPosition;
    // create array of imported timeline
    var importedTimelineString = pastedScript.substr(arrayStartPosition, arrayLengthInString);
    var importedTimelineArrayOfStrings = importedTimelineString.split(", ");
    var importedTimelineArrayOfNumbers = importedTimelineArrayOfStrings.map(Number);
    // find length of previous script's timeline
    var importedTimelineLength = importedTimelineArrayOfNumbers.length;
    // here we need to update the timeline so that it displays the sequence from the script
    for (var i = 0; i < importedTimelineLength; i++) {
        timelineArray[i] = importedTimelineArrayOfNumbers[i];
    }
    let timelineRangeStart = $('timelineRangeStart').val();
    let timelineRangeEnd = $('timelineRangeEnd').val();
    let zoomSlider = $('#zoomSlider').val();
    showSoundtrackTimeline(timelineRangeStart, timelineRangeEnd, zoomSlider);
    // update timeline values, then create a for loop that goes through our new timeline, assigning image audio data to masterBufferData...this will make it so that we have to assign a totalFrameCount equal to the frame count for the imported script...otherwise, we'll get indexoutofrange errors on either side....
    for (var j = 0; j < importedTimelineLength; j++) {
        // create an array that stores the master buffer and current frame's audio data
        var masterBufferData = masterBuffer.getChannelData(0);
        var framesAudioData = bufferArray[timelineArray[j]].getChannelData(0);
        var framesLengthInSamples = framesAudioData.length;
        // create a for-loop that writes the current frame's audio data to the master buffer (masterBufferData) in the correct place
        for (var k = 0; k < framesLengthInSamples; k++) {
            masterBufferData[(j * framesLengthInSamples) + k] = framesAudioData[k];
        }
    }
};
(function () {
    document.addEventListener('keypress', onKeypress, false);
    $('#fileUpload').on('change', function () {
        var el = $(this)[0];
        loadingObjects(el);
        $('#fileUpload').attr('disabled', 'disabled');
        $('#exportButtons').css('display', 'initial');
    });
    $('#timelineRangeStart').on('change', function () {
        let timelineRangeStart = $('timelineRangeStart').val();
        let timelineRangeEnd = $('timelineRangeEnd').val();
        let zoomSlider = $('#zoomSlider').val();
        showSoundtrackTimeline(timelineRangeStart, timelineRangeEnd, zoomSlider);
    });
    $('#timelineRangeEnd').on('change', function () {
        let timelineRangeStart = $('timelineRangeStart').val();
        let timelineRangeEnd = $('timelineRangeEnd').val();
        let zoomSlider = $('#zoomSlider').val();
        showSoundtrackTimeline(timelineRangeStart, timelineRangeEnd, zoomSlider);
    });
})();
