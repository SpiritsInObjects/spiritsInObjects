'use strict';

const { Midi } = require('@tonejs/midi');
const { Frequency } = require('tone');

class Visualize {
    private state : State;
    public sonify : Sonify;
    public so : SoundtrackOptical;

    private tracksSelect : HTMLSelectElement = document.getElementById('vTracks') as HTMLSelectElement;

    private canvas : HTMLCanvasElement = document.getElementById('vCanvas') as HTMLCanvasElement;
    private ctx : CanvasRenderingContext2D;

    private display : HTMLCanvasElement = document.getElementById('vCanvasDisplay') as HTMLCanvasElement;
    private displayCtx : CanvasRenderingContext2D;

    public prev : HTMLButtonElement = document.getElementById('vPrevFrame') as HTMLButtonElement;
    public next : HTMLButtonElement = document.getElementById('vNextFrame') as HTMLButtonElement;
    private current : HTMLInputElement = document.getElementById('vCurrentFrame') as HTMLInputElement;

    private cursor : HTMLElement = document.querySelector('#visualizeTimeline .cursor');
    private scrubbing : boolean = false;

    private type : string = 'midi';

    private filePath : string;
    public displayName : string;
    private name : string;
    private frames : any[];

    private fps : number = 24;
    private frameLength : number = 1000 / this.fps;
    private frame_h : number = 7.62;
    private frameNumber = 0;

    public width : number = 1920;
    public height : number = 1080;
    public samplerate : number = this.height * this.fps;

    public displayWidth : number = 996;
    public displayHeight : number = 560;

    private duration : number; //ms
    private durationTicks : number;
    private durationTick : number;
    private frameCount : number;
    private trackNo : number = 0;
    private trackCount : number;
    private tracksWithNotes : number[] = [];

    constructor (state : State, audioContext : AudioContext) {
        const visualizeState = {
            get : function () { return false }
        } as State;
        this.state = state;
        this.ctx = this.canvas.getContext('2d');
        this.displayCtx = this.display.getContext('2d');
        this.ctx.scale(1, 1);
        this.setFormat(this.width, this.height);
        this.sonify = new Sonify(visualizeState, this.canvas, audioContext);
        this.bindListeners();
    }

    private bindListeners () {
        this.tracksSelect.addEventListener('change', this.changeTrack.bind(this));
        this.next.addEventListener('click', this.nextFrame.bind(this));
        this.prev.addEventListener('click', this.prevFrame.bind(this));
        this.current.addEventListener('change', this.editFrame.bind(this));

        this.cursor.addEventListener('mousedown', this.beginScrubbing.bind(this), false);
        document.addEventListener('mousemove', this.moveScrubbing.bind(this), false);
        document.addEventListener('mouseup', this.endScrubbing.bind(this), false);
    }

    public set (filePath : string, type : string) : string {
        this.filePath = filePath;
        this.type = type;
        this.displayName = basename(filePath);
        return this.displayName;
    }

    private clearTracks () {
        const length : number = this.tracksSelect.options.length;
        for (let i : number = length - 1; i >= 0; i--) {
          this.tracksSelect.options[i] = null;
        }
    }

    private showTracks () {
        try {
            this.tracksSelect.classList.remove('hide');
        } catch (err) {
            //
        }
    }

    private editFrame () {
        let frame : number = parseInt(this.current.value);
        if (frame < 0) {
            frame = 0;
        }
        if (frame > this.frames.length - 1) {
            frame = this.frames.length - 1;
        }
        this.displayFrame(frame);
    }

    public async processMidi () {
        let midi : any;
        let trackStr : string;
        let track: any;

        try {
            midi = await Midi.fromUrl(this.filePath);
        } catch (err) {
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

        this.showTracks();
    }

    private changeTrack () {
        const val : string = this.tracksSelect.value;
        this.decodeMidi(parseInt(val));
    }

    public async decodeMidi (trackIndex : number = 0) {
        let midi : any;
        let msMultiplier : number;
        let pitch : number;
        let ms : number;
        let notes : any[] = [];
        let frames : any[] = [];
        let note: any;
        let track : any;
        let lastNote : number = 0;
        let firstNote : number = -1;

        this.frameNumber = 0;
        this.trackNo = this.tracksWithNotes[trackIndex];
        this.frames = [];

        try {
            midi = await Midi.fromUrl(this.filePath);
        } catch (err) {
            throw err;
        }
        
        this.name = midi.name;
        console.log(this.name);
        console.log(`Decoding track ${this.trackNo}`);
    
        msMultiplier = (60000.0 / parseFloat(midi.header.tempos[0].bpm)) * 4.0;
        
        this.duration = midi.duration * 1000.0;
        this.durationTicks = midi.durationTicks;
        this.durationTick = midi.durationTicks / midi.duration;
        this.frameCount = Math.ceil(this.duration / this.frameLength);
        //this.frames = new Array(this.frameCount);
        this.frames = new Array();

        track = midi.tracks[this.trackNo];
        console.dir(track);

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

        console.log(`${this.frames.length} vs. ${this.frameCount}`)

        this.displayFrame(firstNote);
    }

    private buildNote (track : number, midiNote : any) : any {
        const pitch = Math.round(Frequency(midiNote.name) / this.fps);
        const ms = Math.round(1000.0 * parseFloat(midiNote.duration));
        const frameRaw : number = ms / this.frameLength;
        const frameCount : number = Math.round(frameRaw);
        const startFrame : number = Math.floor( (midiNote.time * 1000.0) / this.frameLength);
        const note : any = {
            track,
            pitch,
            frames : frameCount,
            startFrame,
            ms
        };

        return note;
    }

    private beginScrubbing () {
        this.scrubbing = true;
    }

    private moveScrubbing (evt : MouseEvent) {
        let cursor : number;
        let leftX : number;
        let width : number;
        if (this.scrubbing) {
            leftX = this.cursor.parentElement.offsetLeft;
            width = this.cursor.parentElement.clientWidth;
            cursor = ((evt.pageX - leftX) / width) * 100.0;
            if (cursor < 0) {
                cursor = 0;
            } else if (cursor > 100) {
                cursor = 100;
            }
            this.cursor.style.left = `${cursor}%`;
        }
    }

    private endScrubbing () {
        let percent : number;
        let frame : number;
        if (this.scrubbing) {
            percent = parseFloat((this.cursor.style.left).replace('%', '')) / 100.0;
            frame = Math.floor(this.frames.length * percent);
            //snap to frame
            this.scrubbing = false;
            this.current.value = String(frame);
            this.displayFrame(frame);
        }
    }

    public displayFrame (frameNumber : number) {
        const cursor : number = (frameNumber / this.frames.length) * 100.0;
        let lines : number;

        if (frameNumber < this.frames.length && typeof this.frames[frameNumber] !== 'undefined') {
            if (this.type === 'midi') {
                this.frameNumber = frameNumber;
                lines = this.frames[frameNumber];
                this.frameMidi(lines);
            }
        }

        this.current.value = String(frameNumber);
        this.cursor.style.left = `${cursor}%`;
    }

    public nextFrame () {
        if (this.frameNumber < this.frames.length) {
            this.frameNumber++;
        }
        this.displayFrame(this.frameNumber);
    }
    public prevFrame () {
        if (this.frameNumber > 0) {
            this.frameNumber--;
        }
        this.displayFrame(this.frameNumber);
    }

    private frameMidi ( lines : number ) {
        const segment : number = this.height / lines;
        const thickness : number = Math.floor(segment / 2);
        let position : number;
      
        this.ctx.fillStyle = '#000000';
        this.ctx.strokeStyle = 'rgba(255,255,255,1.0)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        for (let i = 0; i < lines; i++) {
            position = (segment * (i + 0.5));
            this.ctx.lineWidth = thickness;
            this.ctx.beginPath();
            this.ctx.moveTo(0, position);
            this.ctx.lineTo(this.width, position);
            this.ctx.stroke();
        }
        
        this.displayCtx.drawImage(this.canvas, 0, 0, this.width, this.height, 0, 0, this.displayWidth, this.displayHeight);
    } 

    public setFormat (width : number, height : number) {
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
}