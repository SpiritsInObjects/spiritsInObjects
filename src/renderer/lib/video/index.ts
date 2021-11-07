'use strict';

const Timecode = require('smpte-timecode');
const { basename } = require('path');

/** class representing video features */
class Video {
    public element : HTMLVideoElement = document.getElementById('video') as HTMLVideoElement;
    public canvas : HTMLCanvasElement = document.getElementById('canvas') as HTMLCanvasElement;
    public sync : HTMLButtonElement = document.getElementById('sync') as HTMLButtonElement;
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

    private previewCodecs : string[] = [ 'prores', 'hevc' ];
    private preview : boolean = false;
    private previewPath : string;

    public width : number;
    public height : number;
    public framerate : number = 24;
    public frames : number = 0;
    public samplerate : number = 48000;
    public displayName : string;
    public displayWidth : number = 996;
    public displayHeight : number = 560;
    public type : string = 'video';

    private frameArr : string[] = [];

    private interval : any = null;
    public playing : boolean = false;

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
        
        this.element.addEventListener('ended', this.pause.bind(this), false);

        this.next.addEventListener('click', this.nextFrame.bind(this));
        this.prev.addEventListener('click', this.prevFrame.bind(this));
        this.current.addEventListener('change', this.editFrame.bind(this));

        this.cursor.addEventListener('mousedown', this.beginScrubbing.bind(this), false);
        document.addEventListener('mousemove', this.moveScrubbing.bind(this), false);
        document.addEventListener('mouseup', this.endScrubbing.bind(this), false);
        this.cursor.parentElement.addEventListener('click', this.clickScrub.bind(this), false);

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

    /**
     * Set the scrubbing state boolean to true
     */
    private beginScrubbing () {
        this.scrubbing = true;
    }

    /**
     * Invoked on mousemove event when scrubbing video
     * 
     * @param {object} evt     MouseEvent of the mouse moving
     */
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

    /**
     * Invoked on mouseup while scrubbing video
     */
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

    /**
     * Invocked when mouse clicks on timeline, scrubs video to point
     * 
     * @param {object} evt     Click event
     */
    private clickScrub (evt : MouseEvent) {
        const leftX : number = this.cursor.parentElement.offsetLeft;
        const width : number = this.cursor.parentElement.clientWidth;
        const percent : number  = (evt.pageX - leftX) / width;
        const frame : number = Math.floor(this.frames * percent);
        //snap to frame
        this.scrubbing = false;
        this.current.value = String(frame);
        this.editFrame();
    }

    /**
     * Find the closest framerate to a set of values in the class
     * 
     * @param {number} framerate     Framerate to match to preset values
     */
    private closestFramerate (framerate : number) : number {
        const closest = this.framerates.reduce((a, b) => {
            return Math.abs(b - framerate) < Math.abs(a - framerate) ? b : a;
        });
        return closest;
    }

    /**
     * Display the start and end timecode in the two inputs on top of the screen
     * 
     * @param {number} startFrame     Starting frame (usually 0)
     * @param {number} endFrame       Ending frame number
     * @param {number} framerate      Video framerate in FPS
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
     * Called when a file is loaded to be added as a video
     * or image as necessary.
     * 
     * @param {string} filePath Path to video file
     * @param {type} string     Type of file loaded (video/still)
     */
    public file (filePath : string, type : string) {
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

    /**
     * Invoked when preview video is used to supplant a video file
     * that isn't readable in an HTML video element.
     * 
     * @param {string} filePath   Path to video file
     * @param {boolean} sound     Whether video has sound 
     */
    public previewFile (filePath : string, sound : boolean = false) {
        this.preview = true;
        this.previewPath = filePath;
        this.source = document.createElement('source');
        this.source.setAttribute('src', this.previewPath);
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

        if (sound) {
            this.element.removeAttribute('muted');
            this.element.muted = false;
        } else {
            this.element.setAttribute('muted', 'true');
            this.element.muted = true;
        }
    }
    /**
     * Called when a still is loaded
     */
    private onloadstart () {
        this.width = this.element.videoWidth;
        this.height = this.element.videoHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        setTimeout(this.draw.bind(this), 100);
        this.element.removeEventListener('loadeddata', this.onloadstart.bind(this));
        this.sonifyFrameBtn.removeAttribute('disabled');
        this.sonifyVideoBtn.removeAttribute('disabled');
        setTimeout((function () {
            this.ui.updateSliders(this.width, this.height);
        }).bind(this), 101);
    }

    private onloadstartstill () {
        this.width = this.stillLoader.naturalWidth;
        this.height = this.stillLoader.naturalHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ui.updateSliders(this.width, this.height);
        
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

    public onInfo (evt : Event, args : any) : boolean {
        let fpsRaw : string;
        let videoStream : any;
        let secondsRaw : string;
        let preview : boolean  = false;

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

            if (this.previewCodecs.indexOf(videoStream.codec_name) !== -1) {
                preview = true;
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

        return preview;
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
            document.getElementById('dropMessage').classList.add('hide');
        } catch (err) {
            console.error(err);
        }
        try {
            (document.getElementById('fileSourceProxy') as HTMLInputElement).innerHTML = this.displayName;
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

    private playInterval () {
        const time : number = this.element.currentTime / this.element.duration;
        const left : number = time * 100.0;
        let x : number = Math.floor(time * this.frames);
        x = x === -0 ? 0 : x; 
        this.current.value = String(x);
        this.cursor.style.left = `${left}%`;
    }

    public play () {
        let frame : number;
        this.interval = setInterval(this.playInterval.bind(this), Math.round(1000 / this.framerate));
        this.playing = true;
        this.sync.classList.add('playing');
        frame = this.currentFrame();
        this.current.value = String(frame);
        this.element.play();
    }

    public pause () {
        let frame : number;
        this.element.pause();
        clearInterval(this.interval);
        this.interval = null;
        this.playing = false;
        this.sync.classList.remove('playing');

        frame = this.currentFrame();
        this.current.value = String(frame);
    }

    public set (filePath : string, type : string) : string {
        const displayName : string = basename(filePath);
        console.log(`Selected file ${displayName}`);
        this.preview = false;
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
        if (this.type === 'video') {
            frame++;
            if (frame >= this.frames) {
                frame = this.frames - 1;
            }
            this.setFrame(frame);
        }
    }
    public prevFrame () {
        let frame : number = this.currentFrame();
        if (this.type === 'video') {
            frame--;
            if (frame < 0) {
                frame = 0;
            }
            this.setFrame(frame);
        }
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