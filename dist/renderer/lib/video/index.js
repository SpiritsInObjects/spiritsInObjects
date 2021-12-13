'use strict';
const Timecode = require('smpte-timecode');
const { basename } = require('path');
class Video {
    constructor(state, ui) {
        this.element = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.sync = document.getElementById('sync');
        this.prev = document.getElementById('prevFrame');
        this.next = document.getElementById('nextFrame');
        this.current = document.getElementById('currentFrame');
        this.still = document.getElementById('still');
        this.sonifyFrameBtn = document.getElementById('sonifyFrame');
        this.sonifyVideoBtn = document.getElementById('sonifyVideo');
        this.framesDisplay = document.getElementById('frames');
        this.fpsDisplay = document.getElementById('fps');
        this.resolutionDisplay = document.getElementById('resolution');
        this.samplerateDisplay = document.getElementById('samplerate');
        this.selectionDisplay = document.getElementById('selectedarea');
        this.errorDisplay = document.getElementById('displayError');
        this.cursor = document.querySelector('#sonifyTimeline .cursor');
        this.scrubbing = false;
        this.ctx = this.canvas.getContext('2d');
        this.startTimecode = document.getElementById('startTimecode');
        this.endTimecode = document.getElementById('endTimecode');
        this.framerates = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60];
        this.previewCodecs = ['prores', 'hevc'];
        this.preview = false;
        this.framerate = 24;
        this.frames = 0;
        this.samplerate = 48000;
        this.displayWidth = 996;
        this.displayHeight = 560;
        this.type = 'video';
        this.frameArr = [];
        this.interval = null;
        this.playing = false;
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
    }
    restoreState() {
        let filePath = this.state.get('filePath');
        let type = this.state.get('type');
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
            this.state.save();
        }
    }
    beginScrubbing() {
        this.scrubbing = true;
    }
    moveScrubbing(evt) {
        let cursor;
        let leftX;
        let width;
        if (this.scrubbing) {
            leftX = this.cursor.parentElement.offsetLeft;
            width = this.cursor.parentElement.clientWidth;
            cursor = ((evt.pageX - leftX) / width) * 100.0;
            if (cursor < 0) {
                cursor = 0;
            }
            else if (cursor > 100) {
                cursor = 100;
            }
            this.cursor.style.left = `${cursor}%`;
        }
    }
    endScrubbing() {
        let percent;
        let frame;
        if (this.scrubbing) {
            percent = parseFloat((this.cursor.style.left).replace('%', '')) / 100.0;
            frame = Math.floor(this.frames * percent);
            this.scrubbing = false;
            this.current.value = String(frame);
            this.editFrame();
        }
    }
    clickScrub(evt) {
        const leftX = this.cursor.parentElement.offsetLeft;
        const width = this.cursor.parentElement.clientWidth;
        const percent = (evt.pageX - leftX) / width;
        const frame = Math.floor(this.frames * percent);
        this.scrubbing = false;
        this.current.value = String(frame);
        this.editFrame();
    }
    closestFramerate(framerate) {
        const closest = this.framerates.reduce((a, b) => {
            return Math.abs(b - framerate) < Math.abs(a - framerate) ? b : a;
        });
        return closest;
    }
    updateTimecodes(startFrame, endFrame, framerate) {
        framerate = this.closestFramerate(framerate);
        try {
            this.startTC = new Timecode(startFrame, framerate, false);
            this.endTC = new Timecode(endFrame, framerate, false);
            this.startTimecode.value = this.startTC.toString();
            this.endTimecode.value = this.endTC.toString();
        }
        catch (err) {
            console.log(framerate);
            console.error(err);
        }
    }
    file(filePath, type) {
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
            }
            catch (err) {
                console.error(err);
            }
        }
        else if (type === 'still') {
            this.stillLoader = new Image();
            this.current.value = '0';
            this.stillLoader.onload = this.onloadstartstill.bind(this);
            this.still.setAttribute('src', filePath);
            this.stillLoader.setAttribute('src', filePath);
            this.element.classList.add('hide');
            try {
                this.still.classList.remove('hide');
            }
            catch (err) {
                console.error(err);
            }
        }
    }
    previewFile(filePath, sound = false) {
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
        }
        catch (err) {
            console.error(err);
        }
        if (sound) {
            this.element.removeAttribute('muted');
            this.element.muted = false;
        }
        else {
            this.element.setAttribute('muted', 'true');
            this.element.muted = true;
        }
    }
    onloadstart() {
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
    onloadstartstill() {
        this.width = this.stillLoader.naturalWidth;
        this.height = this.stillLoader.naturalHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ui.updateSliders(this.width, this.height);
        this.sonifyFrameBtn.removeAttribute('disabled');
        this.sonifyVideoBtn.removeAttribute('disabled');
        this.drawStill();
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
    onInfo(evt, args) {
        let fpsRaw;
        let videoStream;
        let secondsRaw;
        let preview = false;
        if (args.type === 'video') {
            videoStream = args.streams.find((stream) => {
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
        }
        else if (args.type === 'still') {
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
        this.state.save();
        this.displayInfo();
        this.sonifyFrameBtn.disabled = false;
        this.sonifyVideoBtn.disabled = false;
        return preview;
    }
    displayInfo() {
        const start = this.state.get('start');
        const end = this.state.get('end');
        const selection = Math.round((end - start) * this.width);
        const roundedRate = Math.floor(this.samplerate);
        const rough = this.samplerate - roundedRate > 0.0 ? '~' : '';
        if (this.state.get('page') === 'visualize' || (this.state.get('type') === 'midi' || this.state.get('type') === 'audio')) {
            return false;
        }
        this.framesDisplay.innerHTML = String(this.frames);
        this.fpsDisplay.innerHTML = String(Math.round(this.framerate * 100) / 100);
        this.resolutionDisplay.innerHTML = `${this.width}x${this.height}`;
        this.samplerateDisplay.innerHTML = `${rough}${roundedRate}Hz`;
        this.selectionDisplay.innerHTML = `${selection} px`;
        this.updateTimecodes(0, this.frames, this.framerate);
        try {
            document.querySelector('#sonify .optionWrapper .info').classList.remove('hide');
            document.getElementById('dropMessage').classList.add('hide');
        }
        catch (err) {
            console.error(err);
        }
        try {
            document.getElementById('fileSourceProxy').innerHTML = this.displayName;
        }
        catch (err) {
            console.error(err);
        }
    }
    draw() {
        this.ctx.drawImage(this.element, 0, 0, this.width, this.height);
    }
    drawStill() {
        this.ctx.drawImage(this.stillLoader, 0, 0, this.width, this.height);
    }
    playInterval() {
        const time = this.element.currentTime / this.element.duration;
        const left = time * 100.0;
        let x = Math.floor(time * this.frames);
        x = x === -0 ? 0 : x;
        this.current.value = String(x);
        this.cursor.style.left = `${left}%`;
    }
    play() {
        let frame;
        this.interval = setInterval(this.playInterval.bind(this), Math.round(1000 / this.framerate));
        this.playing = true;
        this.sync.classList.add('playing');
        frame = this.currentFrame();
        this.current.value = String(frame);
        this.element.play();
    }
    pause() {
        let frame;
        this.element.pause();
        clearInterval(this.interval);
        this.interval = null;
        this.playing = false;
        this.sync.classList.remove('playing');
        frame = this.currentFrame();
        this.current.value = String(frame);
    }
    set(filePath, type) {
        const displayName = basename(filePath);
        console.log(`Selected file ${displayName}`);
        this.preview = false;
        this.file(filePath, type);
        this.displayName = displayName;
        return displayName;
    }
    currentFrame() {
        const seconds = this.element.currentTime;
        return Math.round(seconds * this.framerate);
    }
    setFrame(frame) {
        const seconds = frame / this.framerate;
        const cursor = (frame / this.frames) * 100.0;
        this.element.currentTime = seconds;
        this.current.value = String(frame);
        this.cursor.style.left = `${cursor}%`;
        setTimeout(this.draw.bind(this), 100);
    }
    nextFrame() {
        let frame = this.currentFrame();
        if (this.type === 'video') {
            frame++;
            if (frame >= this.frames) {
                frame = this.frames - 1;
            }
            this.setFrame(frame);
        }
    }
    prevFrame() {
        let frame = this.currentFrame();
        if (this.type === 'video') {
            frame--;
            if (frame < 0) {
                frame = 0;
            }
            this.setFrame(frame);
        }
    }
    editFrame() {
        let frame = parseInt(this.current.value);
        if (frame < 0) {
            frame = 0;
        }
        if (frame > this.frames - 1) {
            frame = this.frames - 1;
        }
        this.setFrame(frame);
    }
    errorShow() {
        try {
            this.errorDisplay.classList.remove('hide');
        }
        catch (err) {
            console.error(err);
        }
    }
    errorHide() {
        this.errorDisplay.classList.add('hide');
    }
}
//# sourceMappingURL=index.js.map