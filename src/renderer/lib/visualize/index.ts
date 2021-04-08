'use strict';

const { Midi } = require('@tonejs/midi');
const { Frequency } = require('tone');

class Visualize {
    private state : State;
    public sonify : Sonify;
    private ui : any;

    public so : any;

    private tracksSelect : HTMLSelectElement = document.getElementById('vTracks') as HTMLSelectElement;
    private typesSelect : HTMLSelectElement = document.getElementById('vType') as HTMLSelectElement;
    private wavesSelect : HTMLSelectElement = document.getElementById('vWaves') as HTMLSelectElement;
    private stylesSelect : HTMLSelectElement = document.getElementById('vStyle') as HTMLSelectElement;

    private canvas : HTMLCanvasElement = document.getElementById('vCanvas') as HTMLCanvasElement;
    private ctx : CanvasRenderingContext2D;

    private display : HTMLCanvasElement = document.getElementById('vCanvasDisplay') as HTMLCanvasElement;
    private displayCtx : CanvasRenderingContext2D;

    private audioCanvas : HTMLCanvasElement = document.getElementById('aCanvas') as HTMLCanvasElement;
    private audioCtx : CanvasRenderingContext2D;

    private midiTimeline : HTMLCanvasElement  = document.getElementById('midiTimeline') as HTMLCanvasElement;
    private midiCtx : CanvasRenderingContext2D;

    public prev : HTMLButtonElement = document.getElementById('vPrevFrame') as HTMLButtonElement;
    public next : HTMLButtonElement = document.getElementById('vNextFrame') as HTMLButtonElement;
    private current : HTMLInputElement = document.getElementById('vCurrentFrame') as HTMLInputElement;

    private cursor : HTMLElement = document.querySelector('#visualizeTimeline .cursor');
    private scrubbing : boolean = false;

    private startTimecode : HTMLInputElement = document.getElementById('vStartTimecode') as HTMLInputElement;
    private endTimecode : HTMLInputElement = document.getElementById('vEndTimecode') as HTMLInputElement;
    private startTC : Timecode;
    private endTC : Timecode;

    private framerates : number[] = [ 23.976, 24, 25, 29.97, 30, 50, 59.94, 60 ]; 

    private type : string = 'midi';
    private style : string = 'simple';
    private waves : string = 'square';
    private soundtrackType : string = 'dual variable area';
    private soundtrackFull : boolean = false;

    private filePath : string;
    private tmpAudio : string;
    public displayName : string;
    private name : string;
    public frames : any[];

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
    private trackIndex : number = 0;
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
        this.midiTimeline.width = 970;
        this.midiTimeline.height = 19;
        this.midiCtx = this.midiTimeline.getContext('2d');
        this.audioCtx = this.audioCanvas.getContext('2d');

        this.ctx.scale(1, 1);
        this.setFormat(this.width, this.height);
        this.sonify = new Sonify(visualizeState, this.canvas, audioContext);
        this.bindListeners();
    }

    private bindListeners () {
        this.tracksSelect.addEventListener('change', this.changeTrack.bind(this));
        this.typesSelect.addEventListener('change', this.changeType.bind(this));
        this.wavesSelect.addEventListener('change', this.changeWaves.bind(this));
        //this.stylesSelect.addEventListener('change', this.changeStyles.bind(this));
        this.next.addEventListener('click', this.nextFrame.bind(this));
        this.prev.addEventListener('click', this.prevFrame.bind(this));
        this.current.addEventListener('change', this.editFrame.bind(this));

        this.cursor.addEventListener('mousedown', this.beginScrubbing.bind(this), false);
        document.addEventListener('mousemove', this.moveScrubbing.bind(this), false);
        document.addEventListener('mouseup', this.endScrubbing.bind(this), false);
        this.cursor.parentElement.addEventListener('click', this.clickScrub.bind(this), false);
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

    private showMidi () {
        try {
            this.tracksSelect.classList.remove('hide');
            this.wavesSelect.classList.remove('hide');
            //this.stylesSelect.classList.remove('hide');
        } catch (err) {
            //
        }
        try {
            this.typesSelect.classList.add('hide');
        } catch (err) {
            //
        }
    }

    private showAudio () {
        try {
            this.tracksSelect.classList.add('hide');
            this.wavesSelect.classList.add('hide');
            //this.wavesSelect.classList.add('hide');
        } catch (err) {
            //
        }
        try {
            this.typesSelect.classList.remove('hide');
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

    private changeTrack () {
        const val : string = this.tracksSelect.value;
        this.decodeMidi(parseInt(val));
    }

    private changeWaves () {
        this.waves = this.wavesSelect.value;
        this.decodeMidi(this.trackIndex);
    }

    private changeStyle () {
        this.style = this.stylesSelect.value;
        this.decodeMidi(this.trackIndex);
    }

    private changeType () {
        this.soundtrackType = this.typesSelect.value;
        this.decodeAudio();
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

        this.showMidi();
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
        let noteX : number;
        let noteLen : number;

        this.frameNumber = 0;
        this.trackIndex = trackIndex;
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
        //console.dir(track);

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

    private buildNote (track : number, midiNote : any) : any {
        const pitch = Math.round(Frequency(midiNote.name) / this.fps);
        const ms = Math.floor(1000.0 * parseFloat(midiNote.duration));
        const frameRaw : number = ms / this.frameLength;
        const frameCount : number = Math.floor(frameRaw);
        const startMs : number = (midiNote.time * 1000.0);
        const startFrame : number = Math.floor( startMs / this.frameLength);
        const note : any = {
            track,
            pitch,
            frames : frameCount,
            startFrame,
            startMs,
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

    private clickScrub (evt : MouseEvent) {
        const leftX : number = this.cursor.parentElement.offsetLeft;
        const width : number = this.cursor.parentElement.clientWidth;
        const percent : number  = (evt.pageX - leftX) / width;
        const frame : number = Math.floor(this.frames.length * percent);
        //snap to frame
        this.scrubbing = false;
        this.current.value = String(frame);
        this.displayFrame(frame);
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

        if (this.type === 'audio') {
            this.frameNumber = frameNumber
            this.frameAudio(frameNumber);
        }

        this.current.value = String(frameNumber);
        this.cursor.style.left = `${cursor}%`;
    }

    private sineWave (y : number, segment : number) : number {
        return Math.round(Math.sin((y / segment) * Math.PI) * 255.0);
    }

    private frameMidi ( lines : number ) {
        const segment : number = this.height / lines;
        const thickness : number = Math.floor(segment / 2);
        let brightness : number;
        let position : number;
      
        this.ctx.fillStyle = '#000000';
        this.ctx.strokeStyle = 'rgba(255,255,255,1.0)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        if (this.style === 'simple') {
            if (this.waves === 'square') {
                for (let i = 0; i < lines; i++) {
                    position = (segment * (i + 0.5));
                    this.ctx.lineWidth = thickness;
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, position);
                    this.ctx.lineTo(this.width, position);
                    this.ctx.stroke();
                }
            } else if (this.waves === 'sine') {
                this.ctx.lineWidth = 1;
                for (let y = 0; y < this.height; y++) {
                    brightness = this.sineWave(y % segment, segment);
                    this.ctx.strokeStyle = `rgba(${brightness},${brightness},${brightness},1.0)`;
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, y);
                    this.ctx.lineTo(this.width, y);
                    this.ctx.stroke();
                }
            }
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

    public onProcessAudio (evt : Event, args : any) {
        this.tmpAudio = args.tmpAudio;
        this.showAudio();
        this.decodeAudio();
    }

    public async decodeAudio () {
        const dpi : number = Math.round((this.height / 7.605) * 25.4);
        const soundtrackTypeParts : string[] = this.soundtrackType.split(' full');
        const soundtrackType : string = soundtrackTypeParts[0];

        this.soundtrackFull = soundtrackTypeParts.length > 1;

        //@ts-ignore
        this.so = new SoundtrackOptical(this.audioCanvas, this.tmpAudio, dpi, 0.95, soundtrackType, 'short', true);
        
        try {
            await this.so.decode();
        } catch (err) {
            console.error(err);
        }

        this.frames = new Array(this.so.FRAMES);
        this.updateTimecodes(0, this.frames.length, this.fps);
        this.displayFrame(0);
    }

    private frameAudio (frameNumber : number) {
        const ratio : number = this.audioCanvas.width / this.audioCanvas.height;
        const scaledWidth : number  = this.height * ratio;

        this.so.frame(frameNumber);

        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.width, this.height);

        if (this.soundtrackFull) {
            this.ctx.drawImage(this.audioCanvas, 0, 0, this.audioCanvas.width, this.audioCanvas.height, 0, 0, this.width, this.height);
        } else {
            this.ctx.drawImage(this.audioCanvas, 0, 0, this.audioCanvas.width, this.audioCanvas.height, this.width - scaledWidth, 0, scaledWidth, this.height);
        }
        this.displayCtx.drawImage(this.canvas, 0, 0, this.width, this.height, 0, 0, this.displayWidth, this.displayHeight);
    }

    private closestFramerate (framerate : number) : number {
        const closest = this.framerates.reduce((a, b) => {
            return Math.abs(b - framerate) < Math.abs(a - framerate) ? b : a;
        });
        return closest;
    }

    private updateTimecodes (startFrame : number, endFrame : number, framerate : number) {
        framerate = this.closestFramerate(framerate);
        try {
            this.startTC = new Timecode(startFrame, framerate, false);
            this.endTC   = new Timecode(endFrame,   framerate, false);
            this.startTimecode.value = this.startTC.toString();
            this.endTimecode.value   = this.endTC.toString();
        } catch (err) {
            console.log(framerate);
            console.error(err);
        }
    }

    public exportFrame (frameNumber : number) {
        this.displayFrame(frameNumber);
        return this.ctx.getImageData(0, 0, this.width, this.height);
    }
}