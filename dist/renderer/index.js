'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const os_1 = require("os");
const fs_extra_1 = require("fs-extra");
const { ipcRenderer } = require('electron');
const { dialog } = require('electron').remote;
const humanizeDuration = require('humanize-duration');
const videoExtensions = ['.avi', '.mp4', '.mkv', '.mpg', '.mpeg', '.mov', '.m4v', '.ogg', '.webm'];
const stillExtensions = ['.png', '.jpg', '.jpeg', '.gif'];
const midiExtensions = ['.mid', '.midi'];
const audioExtensions = ['.wav', '.wave'];
let startMoving = false;
let endMoving = false;
let audioContext;
let state;
let video;
let camera;
let sonify;
let visualize;
let ui;
let avgMs = -1;
let timeAvg = -1;
let dnd;
let f;
/* ELEMENTS */
let dropArea;
let fileSourceProxy;
let sonifyFrameBtn;
let sonifyVideo;
let sonifyBtn;
let sonifyCancelBtn;
let visualizeBtn;
async function confirm(message) {
    const config = {
        buttons: ['Yes', 'No'],
        message
    };
    const res = await dialog.showMessageBox(config);
    return res.response === 0;
}
/**
 * class representing the Drag and Drop functionality
 **/
class DragDrop {
    constructor() {
        this.active = false;
        this.overlay = document.getElementById('dragOverlay');
    }
    enter(evt) {
        let files;
        evt.preventDefault();
        if (this.containsFiles(evt)) {
            this.active = true;
            this.overlay.classList.add('show');
        }
    }
    over(evt) {
        evt.preventDefault();
    }
    leave(evt) {
        if (this.active)
            this.active = false;
        try {
            this.overlay.classList.remove('show');
        }
        catch (err) {
            console.error(err);
        }
    }
    async drop(evt) {
        let files;
        let loadFiles = [];
        let paths = [];
        if (this.active) {
            evt.preventDefault();
            files = evt.dataTransfer.files; //squashes ts error
            for (let file of files) {
                loadFiles.push(new Promise((resolve, reject) => {
                    let fileReader = new FileReader();
                    fileReader.onload = (function (file) {
                        paths.push(file.path);
                        return resolve(file);
                    })(file); //dirty ts hack
                    fileReader.readAsDataURL(file);
                }));
            }
            try {
                await Promise.all(loadFiles);
            }
            catch (err) {
                console.error(err);
            }
            f.determineProcess(paths[0]);
        }
        this.leave(evt);
    }
    containsFiles(evt) {
        if (evt.dataTransfer.types) {
            for (var i = 0; i < evt.dataTransfer.types.length; i++) {
                if (evt.dataTransfer.types[i] == "Files") {
                    //console.dir(evt.dataTransfer.files.length)
                    return true;
                }
            }
        }
        return false;
    }
}
/**
 * class representing File i/o functionality
 **/
class Files {
    async select() {
        const options = {
            title: `Select video or image sequence`,
            properties: [`openFile`],
            defaultPath: 'c:/',
            filters: [
                {
                    name: 'All Files',
                    extensions: ['*']
                },
            ]
        };
        let files;
        let filePath;
        try {
            files = await dialog.showOpenDialog(options);
        }
        catch (err) {
            console.error(err);
        }
        if (!files || !files.filePaths || files.filePaths.length === 0) {
            return false;
        }
        filePath = files[0];
        this.determineProcess(filePath);
    }
    async determineProcess(filePath) {
        let valid = true;
        let type = 'video';
        let stats;
        let ext;
        try {
            stats = await fs_extra_1.lstat(filePath);
        }
        catch (err) {
            console.error(err);
            return false;
        }
        ext = path_1.extname(filePath.toLowerCase());
        if (videoExtensions.indexOf(ext) > -1 || stillExtensions.indexOf(ext) > -1) {
            valid = true;
        }
        if (!valid) {
            console.log(`File selection is not valid`);
            return false;
        }
        if (stillExtensions.indexOf(ext) > -1) {
            type = 'still';
        }
        else if (audioExtensions.indexOf(ext) > -1) {
            type = 'audio';
        }
        else if (midiExtensions.indexOf(ext) > -1) {
            type = 'midi';
        }
        if (type === 'video' || type === 'still') {
            ui.page('sonify');
            this.setSonify(filePath, type);
        }
        else if (type === 'audio' || type === 'midi') {
            ui.page('visualize');
            this.setVisualize(filePath, type);
        }
    }
    async setSonify(filePath, type) {
        const elem = document.getElementById('fileSourceProxy');
        let displayName;
        displayName = video.set(filePath, type);
        ipcRenderer.send('info', { filePath, type });
        state.set('filePath', filePath);
        state.set('type', type);
        elem.value = displayName;
        sonifyStart();
    }
    async setVisualize(filePath, type) {
        const elem = document.getElementById('vFileSourceProxy');
        let displayName;
        state.set('filePath', filePath);
        state.set('type', type);
        visualizeStart();
    }
    async save(filePath) {
        const options = {
            defaultPath: os_1.homedir()
        };
        let savePath;
        try {
            savePath = await dialog.showSaveDialog(null, options);
        }
        catch (err) {
            console.error(err);
        }
        if (savePath) {
            savePath.filePath = await this.validatePath(savePath.filePath);
            ipcRenderer.send('save', { filePath, savePath });
        }
    }
    async validatePath(savePath) {
        const saveExt = '.wav';
        const ext = path_1.extname(savePath);
        let proceed = false;
        let i;
        if (ext === '') {
            savePath += saveExt;
        }
        else if (ext.toLowerCase() !== saveExt) {
            try {
                proceed = await confirm(`Sonification file is a WAVE but has the extension "${ext}". Keep extension and continue?`);
            }
            catch (err) {
                console.error(err);
            }
            if (!proceed) {
                i = savePath.lastIndexOf(ext);
                if (i >= 0 && i + ext.length >= savePath.length) {
                    savePath = savePath.substring(0, i) + saveExt;
                }
            }
        }
        return savePath;
    }
}
const audioCtx = new window.AudioContext();
async function sonifyStart() {
    const sonifyState = state.get();
    const displayName = video.displayName;
    let proceed = false;
    try {
        proceed = await confirm(`Sonify ${displayName}? This may take a while.`);
    }
    catch (err) {
        console.log(err);
    }
    if (!proceed) {
        return false;
    }
    ui.overlay.show(`Sonifying ${displayName}...`);
    ipcRenderer.send('sonify', { state: sonifyState });
}
async function sonifyCancel() {
    let proceed = false;
    try {
        proceed = await confirm(`Cancel sonification process?`);
    }
    catch (err) {
        console.log(err);
    }
    if (!proceed) {
        return false;
    }
    ipcRenderer.send('sonify_cancel', {});
}
function onSonifyProgress(evt, args) {
    let timeLeft;
    let timeStr;
    if (avgMs !== -1) {
        timeLeft = (args.frames - args.i) * args.ms;
        timeAvg = timeLeft;
    }
    else {
        avgMs = (avgMs + args.ms) / 2;
        timeLeft = (args.frames - args.i) * avgMs;
        timeAvg = (timeAvg + timeLeft) / 2;
    }
    timeStr = humanizeDuration(Math.round(timeAvg / 1000) * 1000);
    ui.overlay.progress(args.i / args.frames, `~${timeStr}`);
    //console.log(`progress ${args.i}/${args.frames}, time left ${timeLeft / 1000} sec...`);
}
function onSonifyComplete(evt, args) {
    avgMs = -1;
    timeAvg = -1;
    ui.overlay.hide();
    f.save(args.tmpAudio);
}
function onSonifyCancel(evt, args) {
    avgMs = -1;
    timeAvg = -1;
    ui.overlay.hide();
}
function sonifyFrame() {
    const source = audioContext.createBufferSource();
    let buf = audioContext.createBuffer(1, video.height, video.samplerate);
    let mono = buf.getChannelData(0);
    let tmp;
    sonifyFrameBtn.classList.add('active');
    sonify = new Sonify(state, video.canvas);
    tmp = sonify.sonifyCanvas();
    tmp = sonify.envelope(tmp, 100);
    mono.set(tmp, 0);
    //console.dir(tmp)
    source.buffer = buf;
    source.connect(audioContext.destination);
    source.start();
    setTimeout(() => {
        try {
            sonifyFrameBtn.classList.remove('active');
        }
        catch (err) {
            //
        }
    }, 42);
}
async function visualizeStart() {
}
function playSync() {
    video.play();
    //audio.play();
}
function keyDown(evt) {
    if (evt.code === 'Space') {
        video.play();
    }
    else if (evt.code === 'ArrowLeft') {
        video.prevFrame();
    }
    else if (evt.code === 'ArrowRight') {
        video.nextFrame();
    }
    else if (evt.code === 'KeyF') {
        sonifyFrame();
    }
    else if (evt.code === 'KeyI') {
    }
    else if (evt.code === 'KeyO') {
    }
    console.log(evt.code);
}
function bindListeners() {
    dropArea = document.getElementById('dragOverlay');
    fileSourceProxy = document.getElementById('fileSourceProxy');
    sonifyFrameBtn = document.getElementById('sonifyFrame');
    sonifyVideo = document.getElementById('sonifyVideo');
    sonifyBtn = document.getElementById('sonifyBtn');
    sonifyCancelBtn = document.getElementById('sonifyCancel');
    visualizeBtn = document.getElementById('visualizeBtn');
    sonifyBtn.addEventListener('click', function () { ui.page('sonify'); }, false);
    sonifyCancelBtn.addEventListener('click', sonifyCancel, false);
    visualizeBtn.addEventListener('click', function () { ui.page('visualize'); }, false);
    fileSourceProxy.addEventListener('click', f.select.bind(f), false);
    sonifyFrameBtn.addEventListener('click', sonifyFrame, false);
    sonifyVideo.addEventListener('click', sonifyStart, false);
    document.addEventListener('keydown', keyDown, false);
    ipcRenderer.on('sonify_complete', onSonifyComplete);
    ipcRenderer.on('sonify_progress', onSonifyProgress);
    ipcRenderer.on('sonify_cancel', onSonifyCancel);
    ipcRenderer.on('info', (evt, args) => {
        video.oninfo(evt, args);
        sonify = new Sonify(state, video.canvas);
    });
}
/**
 * VISUALIZE
 **/
(async function main() {
    dnd = new DragDrop();
    f = new Files();
    audioContext = new AudioContext();
    //@ts-ignore why are you like this
    state = new State();
    try {
        await state.start();
    }
    catch (err) {
        console.error(err);
    }
    //@ts-ignore
    ui = new UI(state);
    video = new Video(state, ui);
    camera = new Camera(video);
    sonify = new Sonify(state, video.canvas); //need to refresh when settings change
    visualize = new VisualizeMidi(state, document.createElement('canvas'), '');
    bindListeners();
})();
//# sourceMappingURL=index.js.map