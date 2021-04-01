'use strict';
const { Midi } = require('@tonejs/midi');
const { Frequency } = require('tone');
class Visualize {
    constructor(state) {
        this.type = 'midi';
        this.fps = 24;
        this.frameLength = 1000 / this.fps;
        this.frame_h = 7.62;
        this.width = 1920;
        this.height = 1080;
        this.trackNo = 0;
        this.tracksWithNotes = [];
        this.state = state;
        this.canvas = document.getElementById('vCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.display = document.getElementById('vCanvasDisplay');
        this.displayCtx = this.display.getContext('2d');
        this.ctx.scale(1, 1);
        this.setFormat(this.width, this.height);
    }
    set(filePath, type) {
        this.filePath = filePath;
        this.type = type;
        this.displayName = basename(filePath);
        return this.displayName;
    }
    async processMidi() {
        let midi;
        try {
            midi = await Midi.fromUrl(this.filePath);
        }
        catch (err) {
            throw err;
        }
        this.tracksWithNotes = [];
        for (let i = 0; i < midi.tracks.length; i++) {
            if (midi.tracks[i].notes.length === 0) {
                continue;
            }
            this.tracksWithNotes.push(i);
        }
        console.log(`${midi.name} has ${this.tracksWithNotes.length} tracks with notes`);
    }
    async decodeMidi(trackIndex = 0) {
        let midi;
        let msMultiplier;
        let pitch;
        let ms;
        let i = 0;
        let notes = [];
        let frames = [];
        let track;
        this.trackNo = this.tracksWithNotes[trackIndex];
        try {
            midi = await Midi.fromUrl(this.filePath);
        }
        catch (err) {
            throw err;
        }
        this.name = midi.name;
        console.log(this.name);
        console.log(`Decoding track ${this.trackNo}`);
        msMultiplier = (60000.0 / parseFloat(midi.header.tempos[0].bpm)) * 4.0;
        this.duration = midi.duration * 1000;
        this.frameCount = Math.ceil(this.duration / this.frameLength);
        this.frames = new Array(this.frameCount);
        console.dir(midi.duration);
        console.dir(this.frameCount);
        track = midi.tracks[this.trackNo];
        console.dir(track);
        if (track.notes.length === 0) {
            console.log('track does not contain any notes');
            return false;
        }
        for (let note of track.notes) {
            //@ts-ignore
            pitch = Math.round(Frequency(note.name) / this.fps);
            ms = Math.round(1000 * parseFloat(note.duration));
            frames = this.buildNote(this.trackNo, pitch, ms);
            notes[i] = frames;
        }
        console.dir(notes[i]);
    }
    buildNote(track, pitch, ms) {
        const frameRaw = ms / this.frameLength;
        const frameCount = Math.round(frameRaw);
        const frames = [];
        let frame;
        for (let i = 0; i < frameCount; i++) {
            frame = {
                track,
                pitch,
                ms
            };
            frames.push(frame);
        }
        return frames;
    }
    displayFrame(frameNumber) {
        let lines;
        if (frameNumber < this.frames.length && typeof this.frames[frameNumber] !== 'undefined') {
        }
        lines = Math.round(this.frames[frameNumber].pitch / 24.0);
        this.frame(lines);
    }
    nextFrame() {
    }
    prevFrame() {
    }
    frame(lines) {
        const segment = this.height / lines;
        const thickness = Math.floor(segment / 2);
        let position;
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.strokeStyle = '#000000';
        this.ctx.fillRect(0, 0, this.width, this.height);
        for (let i = 0; i < lines; i++) {
            position = (segment * (i + 0.5));
            this.ctx.lineWidth = thickness;
            this.ctx.beginPath();
            this.ctx.moveTo(0, position);
            this.ctx.lineTo(this.width, position);
            this.ctx.stroke();
        }
        this.displayCtx.drawImage(this.canvas, 0, 0, this.width, this.height, 0, 0, 300, 150);
    }
    setFormat(width, height) {
        this.width = width;
        this.height = height;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.state.set('vWidth', this.width);
        this.state.set('vHeight', this.height);
    }
}
//# sourceMappingURL=index.js.map