'use strict';
class Video {
    constructor(state) {
        this.element = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.framerate = 24;
        this.frames = 0;
        this.samplerate = 48000;
        this.interval = null;
        this.playing = false;
        this.streaming = false;
        this.state = state;
        this.ipcRenderer = require('electron').ipcRenderer;
        this.element.setAttribute('playsinline', 'true');
        this.element.setAttribute('webkit-playsinline', 'true');
        this.element.setAttribute('muted', 'true');
        this.element.muted = true;
        this.ipcRenderer.on('info', this.oninfo.bind(this));
    }
    stream(stream) {
        this.element.srcObject = stream;
        //this.element.load();
    }
    file(filePath) {
        this.ipcRenderer.send('info', { filePath });
        this.source = document.createElement('source');
        this.source.setAttribute('src', filePath);
        this.element.appendChild(this.source);
        //this.element.load();
        this.element.addEventListener('loadeddata', this.onloadstart.bind(this));
    }
    onloadstart() {
        this.width = this.element.videoWidth;
        this.height = this.element.videoHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.draw();
        this.element.removeEventListener('loadeddata', this.onloadstart.bind(this));
        document.getElementById('play').removeAttribute('disabled');
    }
    parseFps(line) {
        let fps;
        const parts = line.split('/');
        if (parts.length > 1) {
            fps = parseFloat(parts[0]) / parseFloat(parts[1]);
        }
        else {
            fps = parseFloat(parts[0]);
        }
        return fps;
    }
    oninfo(evt, args) {
        let fpsRaw;
        let videoStream;
        let secondsRaw;
        videoStream = args.streams.find((stream) => {
            if (stream.codec_type === 'video') {
                return stream;
            }
            return false;
        });
        fpsRaw = videoStream.r_frame_rate;
        secondsRaw = videoStream.duration;
        this.framerate = this.parseFps(fpsRaw);
        this.frames = Math.floor(this.framerate * parseFloat(secondsRaw));
        this.width = videoStream.width;
        this.height = videoStream.height;
        this.samplerate = this.height * 24;
        this.state.framerate = this.framerate;
        this.state.frames = this.frames;
        this.state.width = this.width;
        this.state.height = this.height;
        this.state.samplerate = this.samplerate;
        this.state.save();
    }
    draw() {
        this.ctx.drawImage(this.element, 0, 0, this.width, this.height);
        //playFrame();
    }
    play() {
        if (!this.playing) {
            this.element.play();
            this.interval = setInterval(this.draw.bind(this), Math.round(1000 / this.framerate));
            this.playing = true;
        }
        else {
            clearInterval(this.interval);
            this.interval = null;
            this.element.pause();
            this.playing = false;
        }
    }
}
//# sourceMappingURL=index.js.map