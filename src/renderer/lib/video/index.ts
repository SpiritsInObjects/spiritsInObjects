'use strict';

class Video {
    public element : HTMLVideoElement = document.getElementById('video') as HTMLVideoElement;
    public canvas : HTMLCanvasElement = document.getElementById('canvas') as HTMLCanvasElement;
    private ctx : CanvasRenderingContext2D = this.canvas.getContext('2d');
    private source : HTMLSourceElement;
    public width : number;
    public height : number;
    public framerate : number = 24;
    public frames : number = 0;
    public samplerate : number = 48000;
    private ipcRenderer : any;
    private interval : any = null;
    private playing : boolean = false;
    private streaming : boolean = false;
    private state : State;

    constructor (state : State) {
        this.state = state;
        this.ipcRenderer = require('electron').ipcRenderer;
        this.element.setAttribute('playsinline', 'true');
        this.element.setAttribute('webkit-playsinline', 'true');
        this.element.setAttribute('muted', 'true');
        this.element.muted = true;
        this.ipcRenderer.on('info', this.oninfo.bind(this));
    }

    public stream (stream : MediaStream) {
        this.element.srcObject = stream;
        //this.element.load();
    }

    public file (filePath : string) {
        this.ipcRenderer.send('info', { filePath } );
        this.source = document.createElement('source');
        this.source.setAttribute('src', filePath);
        this.element.appendChild(this.source);
        //this.element.load();
        this.element.addEventListener('loadeddata', this.onloadstart.bind(this));
    }

    private onloadstart () {
        this.width = this.element.videoWidth;
        this.height = this.element.videoHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.draw();
        this.element.removeEventListener('loadeddata', this.onloadstart.bind(this));

        document.getElementById('play').removeAttribute('disabled');
    }

    private oninfo (evt : Event, args : any) {
        let fpsRaw : string;
        let videoStream : any;
        let secondsRaw : string;

        videoStream = args.streams.find((stream : any) => {
            if (stream.codec_type === 'video') {
                return stream;
            }
            return false;
        });
      
        fpsRaw = videoStream.r_frame_rate;
        secondsRaw = videoStream.duration;

        this.framerate = parseFloat(fpsRaw);
        this.frames = Math.floor(this.framerate * parseFloat(secondsRaw));
        this.width = videoStream.width;
        this.height = videoStream.height;
        //this.samplerate = this.height * 24;

        this.state.framerate = this.framerate;
        this.state.frames = this.frames;
        this.state.width = this.width;
        this.state.height = this.height;
        //this.state.samplerate = this.samplerate;
        this.state.save();
    }

    public draw () {
        this.ctx.drawImage(this.element, 0, 0, this.width, this.height);
        //playFrame();
    }

    public play () {
        if (!this.playing) {
            this.element.play();
            this.interval = setInterval(this.draw.bind(this), Math.round(1000 / this.framerate));
            this.playing = true;
        } else {
            clearInterval(this.interval)
            this.interval = null;
            this.element.pause();
            this.playing = false;
        }
    }
}