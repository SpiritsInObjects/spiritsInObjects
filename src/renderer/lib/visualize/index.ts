'use strict';

const { Midi } = require('@tonejs/midi');
const { Frequency } = require('tone');

class Visualize {
    private state : State;

    private tracksSelect : HTMLSelectElement;

    private canvas : HTMLCanvasElement;
    private ctx : CanvasRenderingContext2D;

    private display : HTMLCanvasElement;
    private displayCtx : CanvasRenderingContext2D;
    private type : string = 'midi';

    private filePath : string;
    public displayName : string;
    private name : string;
    private frames : any[];

    private fps : number = 24;
    private frameLength : number = 1000 / this.fps;
    private frame_h : number = 7.62;

    private width : number = 1920;
    private height : number = 1080;

    private duration : number; //ms
    private frameCount : number;
    private trackNo : number = 0;
    private trackCount : number;
    private tracksWithNotes : number[] = [];

    constructor (state : State) {
        this.state = state;
        this.canvas = document.getElementById('vCanvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.display = document.getElementById('vCanvasDisplay') as HTMLCanvasElement;
        this.displayCtx = this.display.getContext('2d');
        this.tracksSelect = document.getElementById('vTracks') as HTMLSelectElement;
        this.ctx.scale(1, 1);
        this.setFormat(this.width, this.height);
    }

    public set (filePath : string, type : string) : string {
        this.filePath = filePath;
        this.type = type;
        this.displayName = basename(filePath);
        return this.displayName;
    }

    private clearTracks () {

    }

    private showTracks () {
        this.tracksSelect.
    }

    public async processMidi () {
        let midi : any;

        try {
            midi = await Midi.fromUrl(this.filePath);
        } catch (err) {
            throw err;
        }

        this.tracksWithNotes = [];
        this.clearTracks();

        for (let i = 0; i < midi.tracks.length; i++) {
            if (midi.tracks[i].notes.length === 0) {
                continue;
            }
            this.tracksWithNotes.push(i);
        }
        console.log(`${midi.name} has ${this.tracksWithNotes.length} tracks with notes`);

        this.showTracks();
    }

    public async decodeMidi (trackIndex : number = 0) {
        let midi : any;
        let msMultiplier : number;
        let pitch : number;
        let ms : number;
        let i : number = 0;
        let notes : any[] = [];
        let frames : any[] = [];
        let track : any;

        this.trackNo = this.tracksWithNotes[trackIndex];

        try {
            midi = await Midi.fromUrl(this.filePath);
        } catch (err) {
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
            console.log('track does not contain any notes')
            return false;
        }

        for (let note of track.notes) {
            pitch = Math.round(Frequency(note.name) / this.fps);
            ms = Math.round(1000 * parseFloat(note.duration));
            frames = this.buildNote(this.trackNo, pitch, ms);
            notes[i] = frames;
        }

        console.dir(notes[i]);
    }

    private buildNote (track : number, pitch : number, ms : number) {
        const frameRaw : number = ms / this.frameLength;
        const frameCount : number = Math.round(frameRaw);
        const frames : any[] = [];
        let frame : any;

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

    public displayFrame (frameNumber : number) {
        let lines : number;
        if (frameNumber < this.frames.length && typeof this.frames[frameNumber] !== 'undefined') {

        }
        lines = Math.round(this.frames[frameNumber].pitch / 24.0);
        this.frame(lines);
    }

    public nextFrame () {

    }
    public prevFrame () {
        
    }

    frame ( lines : number ) {
        const segment : number = this.height / lines;
        const thickness : number = Math.floor(segment / 2);
        let position : number;
      
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
        
        this.displayCtx.drawImage(this.canvas, 0, 0, this.width, this.height, 0, 0, 300,150);
    } 

    public setFormat (width : number, height : number) {
        this.width = width;
        this.height = height;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.state.set('vWidth', this.width);
        this.state.set('vHeight', this.height);
    }
}