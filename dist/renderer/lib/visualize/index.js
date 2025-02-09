'use strict';
const { Midi } = require('@tonejs/midi');
const { Frequency } = require('tone');
class Visualize {
    constructor(state, audioContext, ui) {
        this.tracksSelect = document.getElementById('vTracks');
        this.typesSelect = document.getElementById('vType');
        this.wavesSelect = document.getElementById('vWaves');
        this.stylesSelect = document.getElementById('vStyle');
        this.offsetSelect = document.getElementById('vOffset');
        this.resolutionSelect = document.getElementById('vFormat');
        this.canvas = document.getElementById('vCanvas');
        this.display = document.getElementById('vCanvasDisplay');
        this.audioCanvas = document.getElementById('aCanvas');
        this.midiTimeline = document.getElementById('midiTimeline');
        this.prev = document.getElementById('vPrevFrame');
        this.next = document.getElementById('vNextFrame');
        this.current = document.getElementById('vCurrentFrame');
        this.sync = document.getElementById('vSync');
        this.preview = document.getElementById('vPreview');
        this.cursor = document.querySelector('#visualizeTimeline .cursor');
        this.scrubbing = false;
        this.startTimecode = document.getElementById('vStartTimecode');
        this.endTimecode = document.getElementById('vEndTimecode');
        this.startSoundtrack = 0.81;
        this.endSoundtrack = 1.0;
        this.framerates = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60];
        this.resolutions = {
            "1080": { width: 1920, height: 1080 },
            "1152": { width: 2048, height: 1152 },
            "1440": { width: 2560, height: 1440 },
            "2160": { width: 3840, height: 2160 }
        };
        this.resolution = '1080';
        this.type = 'midi';
        this.style = 'simple';
        this.waves = 'square';
        this.soundtrackType = 'variable density full';
        this.soundtrackFull = true;
        this.offset = false;
        this.format = 'prores3';
        this.fps = 24;
        this.frameLength = 1000 / this.fps;
        this.frame_h = 7.62;
        this.frameNumber = 0;
        this.width = 1920;
        this.height = 1080;
        this.samplerate = this.height * this.fps;
        this.displayWidth = 996;
        this.displayHeight = 560;
        this.trackIndex = 0;
        this.trackNo = 0;
        this.tracksWithNotes = [];
        this.previewState = {
            displaying: false,
            rendered: false,
            rendering: false,
            playing: false
        };
        const visualizeState = {
            get: function () { return false; }
        };
        this.ui = ui;
        this.state = state;
        this.ctx = this.canvas.getContext('2d');
        this.displayCtx = this.display.getContext('2d');
        this.midiTimeline.width = 970;
        this.midiTimeline.height = 19;
        this.midiCtx = this.midiTimeline.getContext('2d');
        this.audioCtx = this.audioCanvas.getContext('2d');
        this.ctx.scale(1, 1);
        this.setResolution(this.width, this.height);
        this.sonify = new Sonify(visualizeState, this.canvas, audioContext);
        this.bindListeners();
    }
    bindListeners() {
        this.tracksSelect.addEventListener('change', this.changeTrack.bind(this));
        this.typesSelect.addEventListener('change', this.changeType.bind(this));
        this.wavesSelect.addEventListener('change', this.changeWaves.bind(this));
        this.offsetSelect.addEventListener('change', this.changeOffset.bind(this));
        this.resolutionSelect.addEventListener('change', this.changeResolution.bind(this));
        this.next.addEventListener('click', this.nextFrame.bind(this));
        this.prev.addEventListener('click', this.prevFrame.bind(this));
        this.current.addEventListener('change', this.editFrame.bind(this));
        this.cursor.addEventListener('mousedown', this.beginScrubbing.bind(this), false);
        document.addEventListener('mousemove', this.moveScrubbing.bind(this), false);
        document.addEventListener('mouseup', this.endScrubbing.bind(this), false);
        this.cursor.parentElement.addEventListener('click', this.clickScrub.bind(this), false);
        this.sync.addEventListener('click', this.onSync.bind(this), false);
        this.preview.addEventListener('ended', this.previewEnded.bind(this), false);
    }
    addClass(elem, className) {
        try {
            elem.classList.add(className);
        }
        catch (err) {
        }
    }
    addClassAll(selector, className) {
        const elems = document.querySelectorAll(selector);
        [].forEach.call(elems, (el) => {
            this.addClass(el, className);
        });
    }
    removeClass(elem, className) {
        try {
            elem.classList.remove(className);
        }
        catch (err) {
        }
    }
    removeClassAll(selector, className) {
        const elems = document.querySelectorAll(selector);
        [].forEach.call(elems, (el) => {
            this.removeClass(el, className);
        });
    }
    set(filePath, type) {
        this.filePath = filePath;
        this.type = type;
        this.displayName = basename(filePath);
        return this.displayName;
    }
    clearTracks() {
        const length = this.tracksSelect.options.length;
        for (let i = length - 1; i >= 0; i--) {
            this.tracksSelect.options[i] = null;
        }
    }
    showMidi() {
        this.removeClass(this.tracksSelect, 'hide');
        this.removeClass(this.wavesSelect, 'hide');
        this.removeClass(this.offsetSelect, 'hide');
        this.addClass(this.typesSelect, 'hide');
    }
    showAudio() {
        this.addClass(this.tracksSelect, 'hide');
        this.addClass(this.wavesSelect, 'hide');
        this.addClass(this.offsetSelect, 'hide');
        this.removeClass(this.typesSelect, 'hide');
    }
    editFrame() {
        let frame = parseInt(this.current.value);
        if (frame < 0) {
            frame = 0;
        }
        if (frame > this.frames.length - 1) {
            frame = this.frames.length - 1;
        }
        this.displayFrame(frame);
    }
    changeTrack() {
        const val = this.tracksSelect.value;
        this.decodeMidi(parseInt(val));
        this.save();
    }
    changeWaves() {
        this.waves = this.wavesSelect.value;
        this.decodeMidi(this.trackIndex);
        this.save();
    }
    changeStyle() {
        this.style = this.stylesSelect.value;
        this.decodeMidi(this.trackIndex);
        this.save();
    }
    changeType() {
        this.soundtrackType = this.typesSelect.value;
        this.decodeAudio();
        this.save();
    }
    changeOffset() {
        this.offset = this.offsetSelect.value === 'true';
        if (this.type === 'midi') {
            this.decodeMidi(this.trackIndex);
        }
        else {
            this.decodeAudio();
        }
        this.save();
    }
    changeResolution() {
        this.resolution = this.resolutionSelect.value;
        const width = this.resolutions[this.resolution].width;
        const height = this.resolutions[this.resolution].height;
        this.setResolution(width, height);
        this.save();
    }
    async processMidi() {
        let midi;
        let trackStr;
        let track;
        try {
            midi = await Midi.fromUrl(this.filePath);
        }
        catch (err) {
            throw err;
        }
        this.tracksWithNotes = [];
        this.clearTracks();
        for (let i = 0; i < midi.tracks.length; i++) {
            track = midi.tracks[i];
            if (track.notes.length === 0) {
                continue;
            }
            this.tracksWithNotes.push(i);
            trackStr = `Track ${i + 1}, ${track.instrument.name} [${track.instrument.number}]`;
            this.tracksSelect.options[this.tracksSelect.options.length] = new Option(trackStr, String(this.tracksWithNotes.length - 1));
        }
        console.log(`${midi.name} has ${this.tracksWithNotes.length} tracks with notes`);
        this.showMidi();
    }
    async decodeMidi(trackIndex = 0) {
        let midi;
        let msMultiplier;
        let pitch;
        let ms;
        let notes = [];
        let frames = [];
        let note;
        let track;
        let lastNote = 0;
        let firstNote = -1;
        let noteX;
        let noteLen;
        this.frameNumber = 0;
        this.trackIndex = trackIndex;
        this.trackNo = this.tracksWithNotes[trackIndex];
        this.frames = [];
        try {
            midi = await Midi.fromUrl(this.filePath);
        }
        catch (err) {
            throw err;
        }
        this.previewState.rendered = false;
        try {
            this.sync.removeAttribute('disabled');
        }
        catch (err) {
        }
        this.name = midi.name;
        console.log(this.name);
        console.log(`Decoding track ${this.trackNo}`);
        msMultiplier = (60000.0 / parseFloat(midi.header.tempos[0].bpm)) * 4.0;
        this.duration = midi.duration * 1000.0;
        this.durationTicks = midi.durationTicks;
        this.durationTick = midi.durationTicks / midi.duration;
        this.frameCount = Math.ceil(this.duration / this.frameLength);
        this.frames = new Array();
        track = midi.tracks[this.trackNo];
        if (track.notes.length === 0) {
            console.log('track does not contain any notes');
            return false;
        }
        console.log(`${track.notes.length} notes`);
        for (let midiNote of track.notes) {
            note = this.buildNote(this.trackNo, midiNote);
            notes.push(note);
        }
        for (let note of notes) {
            if (note.startFrame > this.frames.length - 1) {
                for (let i = 0; i < note.startFrame - this.frames.length; i++) {
                    this.frames.push(0);
                }
            }
            if (firstNote === -1) {
                firstNote = this.frames.length;
            }
            for (let i = 0; i < note.frames; i++) {
                this.frames.push(note.pitch);
            }
        }
        if (this.frames.length < this.frameCount) {
            for (let i = 0; i < this.frameCount - this.frames.length; i++) {
                this.frames.push(0);
            }
        }
        if (this.offset) {
            for (let i = 0; i < 26; i++) {
                this.frames.push(0);
            }
        }
        this.midiCtx.fillStyle = '#FFFFFF';
        this.midiCtx.fillRect(0, 0, this.midiTimeline.width, this.midiTimeline.height);
        this.midiCtx.fillStyle = '#E6E6ED';
        for (let note of notes) {
            noteX = (note.startMs / this.duration) * this.midiTimeline.width;
            noteLen = (note.ms / this.duration) * this.midiTimeline.width;
            this.midiCtx.fillRect(noteX, 5, noteLen, 8);
        }
        console.log(`${this.frames.length} vs. ${this.frameCount}`);
        this.updateTimecodes(0, this.frames.length, this.fps);
        this.displayFrame(firstNote);
    }
    buildNote(track, midiNote) {
        const pitch = Math.round(Frequency(midiNote.name) / this.fps);
        const ms = Math.floor(1000.0 * parseFloat(midiNote.duration));
        const frameRaw = ms / this.frameLength;
        const frameCount = Math.floor(frameRaw);
        const startMs = (midiNote.time * 1000.0);
        const startFrame = Math.floor(startMs / this.frameLength);
        const note = {
            track,
            pitch,
            frames: frameCount,
            startFrame,
            startMs,
            ms
        };
        return note;
    }
    beginScrubbing() {
        this.scrubbing = true;
    }
    moveScrubbing(evt) {
        let cursor;
        let leftX;
        let width;
        if (this.scrubbing) {
            leftX = this.cursor.parentElement.offsetLeft;
            width = this.cursor.parentElement.clientWidth;
            cursor = ((evt.pageX - leftX) / width) * 100.0;
            if (cursor < 0) {
                cursor = 0;
            }
            else if (cursor > 100) {
                cursor = 100;
            }
            this.cursor.style.left = `${cursor}%`;
        }
    }
    endScrubbing() {
        let percent;
        let frame;
        if (this.scrubbing) {
            percent = parseFloat((this.cursor.style.left).replace('%', '')) / 100.0;
            frame = Math.floor(this.frames.length * percent);
            this.scrubbing = false;
            this.current.value = String(frame);
            this.displayFrame(frame);
        }
    }
    clickScrub(evt) {
        const leftX = this.cursor.parentElement.offsetLeft;
        const width = this.cursor.parentElement.clientWidth;
        const percent = (evt.pageX - leftX) / width;
        const frame = Math.floor(this.frames.length * percent);
        this.scrubbing = false;
        this.current.value = String(frame);
        this.displayFrame(frame);
    }
    nextFrame() {
        if (this.frameNumber < this.frames.length) {
            this.frameNumber++;
        }
        this.displayFrame(this.frameNumber);
    }
    prevFrame() {
        if (this.frameNumber > 0) {
            this.frameNumber--;
        }
        this.displayFrame(this.frameNumber);
    }
    displayFrame(frameNumber) {
        const cursor = (frameNumber / this.frames.length) * 100.0;
        let lines;
        let offsetLines;
        this.resetPreview();
        if (this.previewState.rendered) {
            this.preview.currentTime = this.preview.duration * (frameNumber / this.frames.length);
        }
        if (frameNumber < this.frames.length && typeof this.frames[frameNumber] !== 'undefined') {
            if (this.type === 'midi') {
                this.frameNumber = frameNumber;
                lines = this.frames[frameNumber];
                if (this.offset) {
                    offsetLines = typeof this.frames[frameNumber - 26] !== 'undefined' ? this.frames[frameNumber - 26] : 0;
                    this.frameMidi(lines, offsetLines);
                }
                else {
                    this.frameMidi(lines);
                }
            }
        }
        if (this.type === 'audio') {
            this.frameNumber = frameNumber;
            this.frameAudio(frameNumber);
        }
        this.current.value = String(frameNumber);
        this.cursor.style.left = `${cursor}%`;
    }
    sineWave(y, segment) {
        return Math.round(Math.sin((y / segment) * Math.PI) * 255.0);
    }
    frameMidiSquare(thickness, position, w) {
        this.ctx.lineWidth = thickness;
        this.ctx.beginPath();
        this.ctx.moveTo(0, position);
        this.ctx.lineTo(w, position);
        this.ctx.stroke();
    }
    frameMidiSine(brightness, y, w) {
        this.ctx.strokeStyle = `rgba(${brightness},${brightness},${brightness},1.0)`;
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(w, y);
        this.ctx.stroke();
    }
    frameMidi(lines, offsetLines = -1) {
        const segment = this.height / lines;
        const thickness = Math.floor(segment / 2);
        let position;
        let brightness;
        let offsetSegment = offsetLines > -1 ? this.height / offsetLines : null;
        let offsetThickness = offsetLines > -1 ? Math.floor(offsetSegment / 2) : null;
        let offsetPosition;
        let offsetBrightness;
        this.ctx.fillStyle = '#000000';
        this.ctx.strokeStyle = 'rgba(255,255,255,1.0)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        if (this.style === 'simple') {
            if (this.waves === 'square') {
                for (let i = 0; i < lines; i++) {
                    position = (segment * (i + 0.5));
                    this.frameMidiSquare(thickness, position, this.width);
                }
                if (offsetLines > -1) {
                    this.ctx.fillRect(0, 0, this.width * this.startSoundtrack, this.height);
                    for (let i = 0; i < offsetLines; i++) {
                        offsetPosition = (offsetSegment * (i + 0.5));
                        this.frameMidiSquare(offsetThickness, offsetPosition, this.width * this.startSoundtrack);
                    }
                }
            }
            else if (this.waves === 'sine') {
                this.ctx.lineWidth = 1;
                for (let y = 0; y < this.height; y++) {
                    brightness = this.sineWave(y % segment, segment);
                    this.frameMidiSine(brightness, y, this.width);
                }
                if (offsetLines > -1) {
                    this.ctx.fillRect(0, 0, this.width * this.startSoundtrack, this.height);
                    for (let y = 0; y < this.height; y++) {
                        offsetBrightness = this.sineWave(y % offsetSegment, offsetSegment);
                        this.frameMidiSine(offsetBrightness, y, this.width * this.startSoundtrack);
                    }
                }
            }
        }
        this.displayCtx.drawImage(this.canvas, 0, 0, this.width, this.height, 0, 0, this.displayWidth, this.displayHeight);
    }
    setResolution(width, height) {
        this.width = width;
        this.height = height;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.display.width = this.displayWidth;
        this.display.height = this.displayHeight;
        this.state.set('vWidth', this.width);
        this.state.set('vHeight', this.height);
        this.samplerate = this.height * this.fps;
    }
    async onProcessAudio(evt, args) {
        this.tmpAudio = args.tmpAudio;
        this.showAudio();
        await this.decodeAudio();
    }
    async decodeAudio() {
        const dpi = Math.round((this.height / 7.605) * 25.4);
        const soundtrackTypeParts = this.soundtrackType.split(' full');
        const soundtrackType = soundtrackTypeParts[0];
        let soundData;
        let timelineScale;
        let topY;
        let bottomY;
        this.soundtrackFull = soundtrackTypeParts.length > 1;
        if (this.soundtrackFull) {
            this.removeClass(this.offsetSelect, 'hide');
        }
        else {
            this.addClass(this.offsetSelect, 'hide');
        }
        this.midiCtx.fillStyle = '#FFFFFF';
        this.midiCtx.fillRect(0, 0, this.midiTimeline.width, this.midiTimeline.height);
        this.so = new SoundtrackOptical(this.audioCanvas, this.tmpAudio, dpi, 0.95, soundtrackType, 'short', true);
        try {
            await this.so.decode();
        }
        catch (err) {
            console.error(err);
        }
        this.previewState.rendered = false;
        try {
            this.sync.removeAttribute('disabled');
        }
        catch (err) {
        }
        soundData = Array.from(this.so.soundData);
        timelineScale = Math.floor(soundData.length / this.midiTimeline.width);
        soundData = soundData.filter((elem, i) => i % timelineScale === 0);
        soundData = soundData.map((val) => Math.round(Math.abs(val) * 19));
        this.midiCtx.fillStyle = '#E6E6ED';
        for (let x = 0; x < this.midiTimeline.width; x++) {
            topY = (this.midiTimeline.height - soundData[x]) / 2;
            bottomY = this.midiTimeline.height - topY;
            this.midiCtx.beginPath();
            this.midiCtx.moveTo(x, topY);
            this.midiCtx.lineTo(x, bottomY);
            this.midiCtx.stroke();
        }
        this.frames = new Array(this.so.FRAMES);
        this.updateTimecodes(0, this.frames.length, this.fps);
        this.displayFrame(0);
    }
    frameAudio(frameNumber) {
        const ratio = this.audioCanvas.width / this.audioCanvas.height;
        const scaledWidth = this.height * ratio;
        const offsetFrame = frameNumber - 26;
        this.so.frame(frameNumber);
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.width, this.height);
        if (this.soundtrackFull) {
            if (this.offset) {
                this.ctx.drawImage(this.audioCanvas, 0, 0, this.audioCanvas.width, this.audioCanvas.height, 0, 0, this.width, this.height);
                this.ctx.fillRect(0, 0, this.width * this.startSoundtrack, this.height);
                if (offsetFrame > -1) {
                    this.so.frame(offsetFrame);
                    this.ctx.drawImage(this.audioCanvas, 0, 0, this.audioCanvas.width, this.audioCanvas.height, 0, 0, this.width * this.startSoundtrack, this.height);
                }
            }
            else {
                this.ctx.drawImage(this.audioCanvas, 0, 0, this.audioCanvas.width, this.audioCanvas.height, 0, 0, this.width, this.height);
            }
        }
        else {
            this.ctx.drawImage(this.audioCanvas, 0, 0, this.audioCanvas.width, this.audioCanvas.height, this.width - scaledWidth, 0, scaledWidth, this.height);
        }
        this.displayCtx.drawImage(this.canvas, 0, 0, this.width, this.height, 0, 0, this.displayWidth, this.displayHeight);
    }
    closestFramerate(framerate) {
        const closest = this.framerates.reduce((a, b) => {
            return Math.abs(b - framerate) < Math.abs(a - framerate) ? b : a;
        });
        return closest;
    }
    updateTimecodes(startFrame, endFrame, framerate) {
        framerate = this.closestFramerate(framerate);
        try {
            this.startTC = new Timecode(startFrame, framerate, false);
            this.endTC = new Timecode(endFrame, framerate, false);
            this.startTimecode.value = this.startTC.toString();
            this.endTimecode.value = this.endTC.toString();
        }
        catch (err) {
            console.log(framerate);
            console.error(err);
        }
    }
    exportFrame(frameNumber) {
        this.displayFrame(frameNumber);
        return this.ctx.getImageData(0, 0, this.width, this.height);
    }
    setPreview() {
        this.removeClass(this.preview, 'hide');
        this.addClass(this.display, 'hide');
        this.previewState.displaying = true;
    }
    resetPreview() {
        this.addClass(this.preview, 'hide');
        this.removeClass(this.display, 'hide');
        this.previewState.displaying = false;
    }
    onSync() {
        if (this.previewState.playing) {
            return this.pause();
        }
        this.setPreview();
        if (this.previewState.rendered) {
            this.play();
        }
        else {
            visualizePreview();
            showSpinner('vSyncSpinner', 'small');
            this.addClass(this.sync, 'rendering');
        }
    }
    onPreview(tmpVideo) {
        const now = (new Date()).getTime();
        const videoPath = `${tmpVideo}?cache=${now}`;
        const source = document.createElement('source');
        this.previewState.rendered = true;
        this.previewState.rendering = false;
        source.setAttribute('src', videoPath);
        this.preview.innerHTML = '';
        this.preview.appendChild(source);
        this.preview.load();
        hideSpinner('vSyncSpinner');
        this.removeClass(this.sync, 'rendering');
        this.play();
    }
    play() {
        if (!this.previewState.displaying) {
            this.setPreview();
        }
        this.previewState.playing = true;
        this.addClass(this.sync, 'playing');
        this.preview.play();
        this.startInterval();
    }
    pause() {
        this.preview.pause();
        this.previewState.playing = false;
        this.removeClass(this.sync, 'playing');
        try {
            clearInterval(this.previewInterval);
        }
        catch (err) {
        }
    }
    previewEnded() {
        this.pause();
    }
    startInterval() {
        this.previewInterval = setInterval(this.previewIntervalFunction.bind(this), 41);
    }
    previewIntervalFunction() {
        const time = this.preview.currentTime / this.preview.duration;
        const left = time * 100.0;
        let x = Math.floor(time * this.frames.length);
        x = x === -0 ? 0 : x;
        this.current.value = String(x);
        this.cursor.style.left = `${left}%`;
    }
    save() {
        this.state.visualize = {
            filePath: this.filePath,
            resolution: this.resolution,
            type: this.type,
            style: this.style,
            waves: this.waves,
            soundtrackType: this.soundtrackType,
            soundtrackFull: this.soundtrackFull,
            offset: this.offset,
            format: this.format
        };
        this.state.save();
    }
    async restore(processAudio) {
        const elem = document.getElementById('vFileSourceProxy');
        let displayName;
        let width;
        let height;
        if (this.state.visualize.filePath && this.state.visualize.filePath != null) {
            displayName = this.set(this.state.visualize.filePath, this.state.visualize.type);
            elem.innerHTML = displayName;
            document.getElementById('vInfo').classList.remove('hide');
            document.getElementById('sonifyVisualizeBtn').removeAttribute('disabled');
            document.getElementById('visualizeExportBtn').removeAttribute('disabled');
            document.getElementById('vDropMessage').classList.add('hide');
            if (this.soundtrackType !== this.state.visualize.soundtrackType) {
                this.typesSelect.value = this.state.visualize.soundtrackType;
                this.soundtrackType = this.state.visualize.soundtrackType;
            }
            if (this.waves !== this.state.visualize.waves) {
                this.wavesSelect.value = this.state.visualize.waves;
                this.waves = this.state.visualize.waves;
            }
            if (this.offset !== this.state.visualize.offset) {
                this.offset = this.state.visualize.offset;
                this.offsetSelect.value = this.offset ? 'true' : 'false';
            }
            if (this.resolution !== this.state.visualize.resolution) {
                this.resolutionSelect.value = this.state.visualize.resolution;
                this.resolution = this.state.visualize.resolution;
                width = this.resolutions[this.resolution].width;
                height = this.resolutions[this.resolution].height;
                this.setResolution(width, height);
            }
            this.type = this.state.visualize.type;
            if (this.type === 'midi') {
                await this.processMidi();
                this.decodeMidi(0);
            }
            else if (this.type === 'audio') {
                processAudio();
            }
            this.ui.page('visualize');
        }
    }
}
//# sourceMappingURL=index.js.map