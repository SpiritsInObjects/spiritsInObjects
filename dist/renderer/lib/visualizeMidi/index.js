'use strict';
class VisualizeMidi {
    constructor(state, canvas, filePath) {
        this.fps = 24;
        this.frameLength = 1000 / this.fps;
        this.frame_h = 7.62;
        this.width = 720;
        this.height = 405;
        this.state = state;
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');
        this.ctx.scale(1, 1);
        this.filePath = filePath;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }
    async decode() {
        let midi;
        let msMultiplier;
        let pitch;
        let ms;
        let i = 0;
        let tracks = [];
        let frames = [];
        try {
            //@ts-ignore
            midi = await Midi.fromUrl(this.filePath);
        }
        catch (err) {
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
        midi.tracks.forEach(async (track) => {
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
    buildNote(track, pitch, ms) {
        const frameRaw = ms / this.frameLength;
        const frameCount = Math.round(frameRaw);
        const frames = [];
        let frame;
        for (let i = 0; i < frameCount; i++) {
            frame = {
                track,
                pitch
            };
            frames.push(frame);
        }
        return frames;
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
    }
}
//# sourceMappingURL=index.js.map