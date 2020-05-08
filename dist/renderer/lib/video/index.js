'use strict';
/** class representing video features */
class Video {
    /**
     * @constructor
     * Create Video class, initialize UI elements and bind listeners
     *
     * @param {Object} state State class
     * @param {Object} ui UI class
     */
    constructor(state, ui) {
        this.element = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.playButton = document.getElementById('play');
        this.prev = document.getElementById('prevFrame');
        this.next = document.getElementById('nextFrame');
        this.current = document.getElementById('currentFrame');
        this.ctx = this.canvas.getContext('2d');
        this.framerate = 24;
        this.frames = 0;
        this.samplerate = 48000;
        this.interval = null;
        this.playing = false;
        this.streaming = false;
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
        this.restoreState();
    }
    /**
     * Restore the apps saved state to the video UI
     */
    restoreState() {
        this.framerate = this.state.get('framerate');
        this.frames = this.state.get('frames');
        this.width = this.state.get('width');
        this.height = this.state.get('height');
        this.samplerate = this.state.get('samplerate');
        this.ui.updateSliders(this.width, this.height);
    }
    /**
     * Attach stream to video element and Canvas
     *
     * @param {Object} stream MediaStream from camera/live source
     */
    stream(stream) {
        this.element.srcObject = stream;
        //this.element.load();
    }
    /**
     *
     *
     * @param {string} filePath Path to video file
     */
    file(filePath) {
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
        this.ui.updateSliders(this.width, this.height);
        setTimeout(this.draw.bind(this), 100);
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
        this.state.set('framerate', this.framerate);
        this.state.set('frames', this.frames);
        this.state.set('width', this.width);
        this.state.set('height', this.height);
        this.state.set('samplerate', this.samplerate);
        this.state.save();
        document.getElementById('sonifyFrame').disabled = false;
    }
    draw() {
        this.ctx.drawImage(this.element, 0, 0, this.width, this.height);
    }
    play() {
        let frame;
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
        frame = this.currentFrame();
        this.current.value = String(frame);
    }
    playButtonOnClick(evt) {
        this.play();
    }
    set(pathStr) {
        const displayName = pathStr.split('/').pop();
        console.log(`Selected file ${displayName}`);
        this.file(pathStr);
        return displayName;
    }
    currentFrame() {
        const seconds = this.element.currentTime;
        return Math.round(seconds * this.framerate);
    }
    setFrame(frame) {
        const seconds = frame / this.framerate;
        this.element.currentTime = seconds;
        this.current.value = String(frame);
    }
    nextFrame() {
        let frame = this.currentFrame();
        frame++;
        if (frame > this.frames) {
            frame = this.frames;
        }
        this.setFrame(frame);
    }
    prevFrame() {
        let frame = this.currentFrame();
        frame--;
        if (frame < 0) {
            frame = 0;
        }
        this.setFrame(frame);
    }
    editFrame() {
        let frame = parseInt(this.current.value);
        if (frame < 0) {
            frame = 0;
        }
        if (frame > this.frames) {
            frame = this.frames;
        }
        this.setFrame(frame);
    }
}
//# sourceMappingURL=index.js.map