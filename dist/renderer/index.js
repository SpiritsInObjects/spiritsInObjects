'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const os_1 = require("os");
const { ipcRenderer } = require('electron');
const { dialog } = require('electron').remote;
const humanizeDuration = require('humanize-duration');
const extensions = ['.mp4', '.mkv', '.mpg', '.mpeg'];
let startMoving = false;
let endMoving = false;
let audioContext;
let state;
let video;
let camera;
let sonify;
let ui;
let avgMs = -1;
let timeAvg = -1;
const progressBar = document.getElementById('overlayProgressBar');
const progressMsg = document.getElementById('overlayProgressMsg');
(async function main() {
    async function confirm(message) {
        const config = {
            buttons: ['Yes', 'Cancel'],
            message
        };
        const res = await dialog.showMessageBox(config);
        return res.response === 0;
    }
    ;
    function overlayShow(msg = '') {
        showSpinner('overlaySpinner');
        document.getElementById('overlayMsg').innerText = msg;
        document.getElementById('overlay').classList.add('show');
    }
    function overlayHide() {
        try {
            document.getElementById('overlay').classList.remove('show');
        }
        catch (err) {
            console.error(err);
        }
        document.getElementById('overlayMsg').innerText = '';
        hideSpinner('overlaySpinner');
    }
    function containsFiles(evt) {
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
    function dragEnter(evt) {
        if (containsFiles(evt)) {
            document.getElementById('dragOverlay').classList.add('show');
            //console.log('dragEnter');
            //console.dir(evt);
        }
    }
    function dragLeave(evt) {
        try {
            document.getElementById('dragOverlay').classList.remove('show');
        }
        catch (err) {
            console.error(err);
        }
        //console.log('dragLeave');
    }
    function dropFunc(evt) {
        console.log('drop');
        evt.preventDefault();
        const files = evt.dataTransfer.files; //squashes ts error
        console.dir(evt.dataTransfer);
        //evt.stopPropagation();
        //
        for (let file of files) {
            let fileReader = new FileReader();
            fileReader.onload = (function (file) {
                console.dir(file);
            })(file); //dirty ts hack
            fileReader.readAsDataURL(file);
        }
        dragLeave(evt);
    }
    async function fileSelect() {
        const elem = document.getElementById('fileSourceProxy');
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
        let valid = false;
        let proceed = false;
        let filePath;
        let displayName;
        let ext;
        try {
            files = await dialog.showOpenDialog(options);
        }
        catch (err) {
            console.error(err);
        }
        if (!files || !files.filePaths || files.filePaths.length === 0) {
            return false;
        }
        filePath = files.filePaths[0];
        if (filePath && filePath !== '') {
            ext = path_1.extname(filePath.toLowerCase());
            valid = extensions.indexOf(ext) === -1 ? false : true;
            if (!valid) {
                console.log(`Cannot select file ${filePath} is invald`);
                return false;
            }
            displayName = video.set(filePath);
            ipcRenderer.send('info', { filePath });
            state.set('files', [filePath]);
            state.save();
            sonifyStart();
        }
    }
    async function fileSave(filePath) {
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
            ipcRenderer.send('save', { filePath, savePath });
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
        overlayShow(`Sonifying ${displayName}...`);
        ipcRenderer.send('sonify', { state: sonifyState });
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
        progressMsg.innerText = `~${timeStr}`;
        progressBar.style.width = `${(args.i / args.frames) * 100}%`;
        //console.log(`progress ${args.i}/${args.frames}, time left ${timeLeft / 1000} sec...`);
    }
    function onSonifyComplete(evt, args) {
        avgMs = -1;
        timeAvg = -1;
        overlayHide();
        fileSave(args.tmpAudio);
    }
    function playFrame() {
        const source = audioContext.createBufferSource();
        let buf = audioContext.createBuffer(1, video.height, video.samplerate);
        let mono = buf.getChannelData(0);
        let tmp;
        sonify = new Sonify(state, video.canvas);
        tmp = sonify.sonifyCanvas();
        tmp = sonify.fade(tmp);
        mono.set(tmp, 0);
        //console.dir(tmp)
        source.buffer = buf;
        source.connect(audioContext.destination);
        source.start();
    }
    function playSync() {
        video.play();
        //audio.play();
    }
    function keyDown(evt) {
        if (evt.which === 32) {
            video.play();
        }
    }
    function bindListeners() {
        const dropArea = document.getElementById('dragOverlay');
        const fileSourceProxy = document.getElementById('fileSourceProxy');
        const sonifyFrame = document.getElementById('sonifyFrame');
        const sonifyVideo = document.getElementById('sonifyVideo');
        document.addEventListener('dragenter', dragEnter, false);
        dropArea.addEventListener('dragleave', dragLeave, false);
        dropArea.addEventListener('dragover', dragEnter, false);
        dropArea.addEventListener('drop', dropFunc, false);
        document.addEventListener('drop', dropFunc, false);
        dropArea.addEventListener('dragend', dragLeave, false);
        dropArea.addEventListener('dragexit', dragLeave, false);
        fileSourceProxy.addEventListener('click', fileSelect, false);
        sonifyFrame.addEventListener('click', playFrame, false);
        sonifyVideo.addEventListener('click', sonifyStart, false);
        document.addEventListener('keydown', keyDown, false);
        ipcRenderer.on('sonify_complete', onSonifyComplete);
        ipcRenderer.on('sonify_progress', onSonifyProgress);
        ipcRenderer.on('info', (evt, args) => {
            video.oninfo(evt, args);
            sonify = new Sonify(state, video.canvas);
        });
    }
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
    bindListeners();
})();
//# sourceMappingURL=index.js.map