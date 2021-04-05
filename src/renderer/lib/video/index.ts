'use strict';

const Timecode = require('smpte-timecode');
const { basename } = require('path');

/** class representing video features */
class Video {
    public element : HTMLVideoElement = document.getElementById('video') as HTMLVideoElement;
    public canvas : HTMLCanvasElement = document.getElementById('canvas') as HTMLCanvasElement;
    public playButton : HTMLButtonElement = document.getElementById('play') as HTMLButtonElement;
    public prev : HTMLButtonElement = document.getElementById('prevFrame') as HTMLButtonElement;
    public next : HTMLButtonElement = document.getElementById('nextFrame') as HTMLButtonElement;
    public current : HTMLButtonElement = document.getElementById('currentFrame') as HTMLButtonElement;

    public still : HTMLImageElement = document.getElementById('still') as HTMLImageElement;
    public stillLoader : HTMLImageElement;

    public sonifyFrameBtn : HTMLButtonElement = document.getElementById('sonifyFrame') as HTMLButtonElement;
    public sonifyVideoBtn : HTMLButtonElement = document.getElementById('sonifyVideo') as HTMLButtonElement;

    private framesDisplay : HTMLSpanElement = document.getElementById('frames') as HTMLSpanElement;
    private fpsDisplay : HTMLSpanElement = document.getElementById('fps') as HTMLSpanElement;
    private resolutionDisplay : HTMLSpanElement = document.getElementById('resolution') as HTMLSpanElement;
    private samplerateDisplay : HTMLSpanElement = document.getElementById('samplerate') as HTMLSpanElement;
    private selectionDisplay : HTMLSpanElement = document.getElementById('selectedarea') as HTMLSpanElement;
    private errorDisplay : HTMLElement = document.getElementById('displayError');


    private cursor : HTMLElement = document.querySelector('#sonifyTimeline .cursor');
    private scrubbing : boolean = false;

    private ctx : CanvasRenderingContext2D = this.canvas.getContext('2d');
    private source : HTMLSourceElement;

    private startTimecode : HTMLInputElement = document.getElementById('startTimecode') as HTMLInputElement;
    private endTimecode : HTMLInputElement = document.getElementById('endTimecode') as HTMLInputElement;
    private startTC : Timecode;
    private endTC : Timecode;

    private framerates : number[] = [ 23.976, 24, 25, 29.97, 30, 50, 59.94, 60 ]; 

    public width : number;
    public height : number;
    public framerate : number = 24;
    public frames : number = 0;
    public samplerate : number = 48000;
    public displayName : string;
    public type : string = 'video';

    private frameArr : string[] = [];

    private interval : any = null;
    private playing : boolean = false;
    private streaming : boolean = false;

    private state : State;
    private ui : any;

    /**
     * @constructor
     * Create Video class, initialize UI elements and bind listeners
     * 
     * @param {Object} state State class
     * @param {Object} ui UI class
     */
    constructor (state : State, ui : any) {
        this.state = state;
        this.ui = ui;

        this.element.setAttribute('playsinline', 'true');
        this.element.setAttribute('webkit-playsinline', 'true');
        this.element.setAttribute('muted', 'true');
        this.element.muted = true;
        
        this.playButton.addEventListener('click', this.playButtonOnClick.bind(this), false);
        this.next.addEventListener('click', this.nextFrame.bind(this));
        this.prev.addEventListener('click', this.prevFrame.bind(this));
        this.current.addEventListener('change', this.editFrame.bind(this));

        this.cursor.addEventListener('mousedown', this.beginScrubbing.bind(this), false);
        document.addEventListener('mousemove', this.moveScrubbing.bind(this), false);
        document.addEventListener('mouseup', this.endScrubbing.bind(this), false);

        this.ui.onSelectionChange = this.displayInfo.bind(this);

        this.updateTimecodes(0, 0, 24);
        //this.restoreState();
    }

    /**
     * Restore the apps saved state to the video UI
     */
    private restoreState () {
        let filePath : string = this.state.get('filePath');
        let type : string = this.state.get('type');
        if (filePath && filePath.length > 0 && (type === 'still' || type === 'video')) {
            this.framerate = this.state.get('framerate');
            this.frames = this.state.get('frames');
            this.width = this.state.get('width');
            this.height = this.state.get('height');
            this.samplerate = this.state.get('samplerate');
            this.type = type;

            this.ui.updateSliders(this.width, this.height);
            this.file(filePath, this.type);
            this.displayName = basename(filePath);
            this.displayInfo();
            this.sonifyFrameBtn.removeAttribute('disabled');
            this.sonifyVideoBtn.removeAttribute('disabled');
        }
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
            frame = Math.floor(this.frames * percent);
            //snap to frame
            this.scrubbing = false;
            this.current.value = String(frame);
            this.editFrame();
        }
    }

    private closestFramerate (framerate : number) : number {
        const closest = this.framerates.reduce((a, b) => {
            return Math.abs(b - framerate) < Math.abs(a - framerate) ? b : a;
        });
        return closest;
    }

    /**
     *    Display the timecode in the two
     **/
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

    /**
     * Attach stream to video element and Canvas
     * 
     * @param {Object} stream MediaStream from camera/live source
     */
    public stream (stream : MediaStream) {
        this.element.srcObject = stream;
        //this.element.load();
    }

    /**
     * 
     * 
     * @param {string} filePath Path to video file
     */
    public async file (filePath : string, type : string) {
        if (type === 'video') {
            this.source = document.createElement('source');
            this.source.setAttribute('src', filePath);
            this.element.innerHTML = '';
            this.element.appendChild(this.source);
            this.element.addEventListener('loadeddata', this.onloadstart.bind(this));
            this.element.load();
            this.current.value = '0';

            this.still.classList.add('hide');
            try {
                this.element.classList.remove('hide');
            } catch (err) {
                console.error(err);
            }
        } else if (type === 'still') {
            this.stillLoader = new Image();

            this.current.value = '0';
            this.stillLoader.onload = this.onloadstartstill.bind(this);

            this.still.setAttribute('src', filePath);
            this.stillLoader.setAttribute('src', filePath);

            this.element.classList.add('hide');
            try {
                this.still.classList.remove('hide');
            } catch (err) {
                console.error(err);
            }
        }
    }

    private onloadstart () {
        this.width = this.element.videoWidth;
        this.height = this.element.videoHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.ui.updateSliders(this.width, this.height);
        setTimeout(this.draw.bind(this), 100);
        this.element.removeEventListener('loadeddata', this.onloadstart.bind(this));
        document.getElementById('play').removeAttribute('disabled');
        this.sonifyFrameBtn.removeAttribute('disabled');
        this.sonifyVideoBtn.removeAttribute('disabled');
    }

    private onloadstartstill () {
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ui.updateSliders(this.width, this.height);
        
        //document.getElementById('play').setAttribute('disabled', 'disabled');
        //document.getElementById('play').removeAttribute('disabled');
        this.sonifyFrameBtn.removeAttribute('disabled');
        this.sonifyVideoBtn.removeAttribute('disabled');

        //no delay needed?
        this.drawStill();
    }

    private parseFps (line : string) {
        let fps : number;
        const parts = line.split('/');
        if (parts.length > 1) {
            fps = parseFloat(parts[0]) / parseFloat(parts[1]);
        } else {
            fps = parseFloat(parts[0]);
        }
        return fps;
    }

    public oninfo (evt : Event, args : any) {
        let fpsRaw : string;
        let videoStream : any;
        let secondsRaw : string;

        if (args.type === 'video') {
            videoStream = args.streams.find((stream : any) => {
                if (stream.codec_type === 'video') {
                    return stream;
                }
                return false;
            });
            if (typeof videoStream.duration === 'undefined') {
                if (typeof args.format !== 'undefined' && typeof args.format.duration !== 'undefined') {
                    videoStream.duration = args.format.duration;
                }
            }
            fpsRaw = videoStream.r_frame_rate;
            secondsRaw = videoStream.duration;
            this.framerate = this.parseFps(fpsRaw);
            this.frames = Math.floor(this.framerate * parseFloat(secondsRaw));
        } else if (args.type === 'still') {
            videoStream = args.streams[0];
            this.framerate = 24;
            this.frames = args.frames;
        }
      


        this.width = videoStream.width;
        this.height = videoStream.height;
        this.samplerate = this.height * this.framerate;
        this.type = args.type;

        this.state.set('framerate', this.framerate);
        this.state.set('frames', this.frames);
        this.state.set('width', this.width);
        this.state.set('height', this.height);
        this.state.set('samplerate', this.samplerate);
        this.state.set('type', this.type);

        this.displayInfo();

        this.sonifyFrameBtn.disabled  = false;
        this.sonifyVideoBtn.disabled  = false;
    }

    private displayInfo () {
        const start : number = this.state.get('start');
        const end : number = this.state.get('end');
        const selection : number = Math.round((end - start) * this.width);
        const roundedRate : number = Math.floor(this.samplerate);
        const rough : string = this.samplerate - roundedRate > 0.0 ? '~' : '';

        if (this.state.get('page') === 'visualize' || (this.state.get('type') === 'midi' || this.state.get('type') === 'audio' )) {
            return false;
        }

        this.framesDisplay.innerHTML = String(this.frames);
        this.fpsDisplay.innerHTML =  String(Math.round(this.framerate * 100) / 100);
        this.resolutionDisplay.innerHTML = `${this.width}x${this.height}`;
        this.samplerateDisplay.innerHTML = `${rough}${roundedRate}Hz`;
        this.selectionDisplay.innerHTML = `${selection} px`;

        this.updateTimecodes(0, this.frames, this.framerate);

        try {
            document.querySelector('#sonify .optionWrapper .info').classList.remove('hide');
        } catch (err) {
            console.error(err);
        }
        try {
            (document.getElementById('fileSourceProxy') as HTMLInputElement).value = this.displayName;
        } catch (err) {
            console.error(err);
        }
    }

    public draw () {
        this.ctx.drawImage(this.element, 0, 0, this.width, this.height);
    }

    public drawStill () {
        this.ctx.drawImage(this.stillLoader, 0, 0, this.width, this.height);
    }

    public play () {
        let frame : number;
        if (!this.playing) {
            this.element.play();
            this.interval = setInterval(this.draw.bind(this), Math.round(1000 / this.framerate));
            this.playing = true;
            this.playButton.innerHTML = 'Pause Muted';
        } else {
            clearInterval(this.interval);
            this.interval = null;
            this.element.pause();
            this.playing = false;
            this.playButton.innerHTML = 'Play Muted';
        }
        frame = this.currentFrame();
        this.current.value = String(frame);
    }

    private playButtonOnClick (evt : MouseEvent) {
        this.play();
    }

    public set (filePath : string, type : string) : string {
        const displayName : string = basename(filePath);
        console.log(`Selected file ${displayName}`);
            
        this.file(filePath, type);
        this.displayName = displayName;
        return displayName;
    }

    public currentFrame () {
        const seconds : number = this.element.currentTime;
        return Math.round(seconds * this.framerate);
    }

    public setFrame (frame : number) {
        const seconds : number = frame / this.framerate;
        const cursor : number = (frame / this.frames) * 100.0;
        this.element.currentTime = seconds;
        this.current.value = String(frame);
        this.cursor.style.left = `${cursor}%`;

        setTimeout(this.draw.bind(this), 100);
    }

    public nextFrame () {
        let frame : number = this.currentFrame();
        frame++;
        if (frame >= this.frames) {
            frame = this.frames - 1;
        }
        this.setFrame(frame);
    }
    public prevFrame () {
        let frame : number = this.currentFrame();
        console.log('peing called');
        frame--;
        if (frame < 0) {
            frame = 0;
        }
        this.setFrame(frame);
    }
    public editFrame () {
        let frame : number = parseInt(this.current.value);
        if (frame < 0) {
            frame = 0;
        }
        if (frame > this.frames - 1) {
            frame = this.frames - 1;
        }
        this.setFrame(frame);
    }

    public errorShow () {
        try {
            this.errorDisplay.classList.remove('hide');
        } catch (err) {
            console.error(err);
        }
    }
    public errorHide () {
        this.errorDisplay.classList.add('hide');
    }

    private frameToTimecode (frame : number) {
        
    }
}