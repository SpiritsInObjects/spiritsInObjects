'use strict';

class VisualizeMidi {
    private state : State;

    private canvas : HTMLCanvasElement;
    private ctx : CanvasRenderingContext2D;

    private filePath : string;
    private name : string;
    private frames : any[];

    private fps : number = 24;
    private frameLength : number = 1000 / this.fps;
    private frame_h : number = 7.62;

    private width : number = 720;
    private height : number = 405;

    private duration : number; //ms
    private frameCount : number;

    constructor (state : State, canvas : HTMLCanvasElement, filePath : string) {
        this.state = state;
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');
        this.ctx.scale(1, 1);
        this.filePath = filePath;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    async decode () {
        let midi : any;
        let msMultiplier : number;
        let pitch : number;
        let ms : number;
        let i : number = 0;
        let tracks : any[] = [];
        let frames : any[] = [];

        try {
            //@ts-ignore
            midi = await Midi.fromUrl(this.filePath);
        } catch (err) {
            throw err;
        }
        
        this.name = midi.name;
    
        msMultiplier = (60000 / parseFloat(midi.header.tempos[0].bpm)) * 4;
        
        this.duration = midi.duration * 1000;
        this.frameCount = Math.ceil(this.duration / this.frameLength);
        this.frames = new Array(this.frameCount);

        console.dir(midi);
        console.dir(midi.duration);
        console.dir(midi.tracks);
        console.dir(this.frameCount);

        midi.tracks.forEach(async (track : any) => {
            if (track.notes.length === 0) {
                return false;
            }
            tracks[i] = [];
            for (let note of track.notes) {
                //@ts-ignore
                pitch = Math.round(Tone.Frequency(note.name) / this.fps);
                ms = Math.round(1000 * parseFloat(note.duration));
                frames = this.buildNote(i, pitch, ms);
                tracks[i] = tracks[i].concat(frames);
            }
            i++;
        });
        for (let track of tracks) {
            console.log(track.length + ' vs ' + this.frames.length);
            for (let frame of frames) {
                
            }
        }
    }
    buildNote (track : number, pitch : number, ms : number) {
        const frameRaw : number = ms / this.frameLength;
        const frameCount : number = Math.round(frameRaw);
        const frames : any[] = [];
        let frame : any;

        for (let i = 0; i < frameCount; i++) {
            frame = {
                track,
                pitch
            };
            frames.push(frame);
        }
        return frames;
    }
    frame (lines : number) {
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
    } 
}