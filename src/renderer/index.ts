'use strict';

import { basename, extname, join } from 'path';
import { homedir } from 'os';
import { lstat, readdir } from 'fs-extra';

const { ipcRenderer } = require('electron');
const { dialog } = require('electron').remote;

const humanizeDuration = require('humanize-duration');

const videoExtensions : string[] = ['.avi', '.mp4', '.mkv', '.mpg', '.mpeg', '.mov', '.m4v', '.ogg', '.webm'];
const stillExtensions : string[] = ['.png', '.jpg', '.jpeg', '.gif'];
const midiExtensions : string[] = ['.mid', '.midi'];
const audioExtensions : string[] = ['.mp3', '.ogg', '.aiff', '.aif',  '.wav', '.wave'];

let startMoving : boolean = false;
let endMoving : boolean = false;

let audioContext : AudioContext;
let state : State;
let video : Video;
let camera : Camera;
let sonify : Sonify;
let visualize : Visualize;
let ui : any;

let avgMs : number = -1;
let timeAvg : number = -1;
let dnd : DragDrop;
let f : Files;

/* ELEMENTS */

let dropArea : HTMLElement;
let fileSourceProxy : HTMLInputElement;
let vFileSourceProxy : HTMLInputElement;
let sonifyFrameBtn : HTMLButtonElement;
let sonifyVideo : HTMLButtonElement;
let sonifyBtn : HTMLElement;
let sonifyCancelBtn : HTMLElement;
let visualizeBtn : HTMLElement;
let sonifyVisualizeBtn : HTMLButtonElement;
let visualizeExportBtn : HTMLButtonElement;

async function confirm (message : string) {
    const config = {
        buttons : ['Yes', 'No'],
        message
    };
    const res = await dialog.showMessageBox(config);
    return res.response === 0;
}

/**
 * class representing the Drag and Drop functionality
 **/

class DragDrop {
    private active : boolean = false;
    private overlay : HTMLElement;

    constructor () {
        this.overlay = document.getElementById('dragOverlay');
    }

    public enter (evt: DragEvent) {
        let files : any[];
        evt.preventDefault();
        if (this.containsFiles(evt)) {
            this.active = true;
            this.overlay.classList.add('show');
        }
    }

    public over (evt: DragEvent) {
        evt.preventDefault();
    }

    public leave (evt: Event) {
        if (this.active) this.active = false;
        try {
            this.overlay.classList.remove('show');
        } catch (err) {
            console.error(err);
        }
    }

    public async drop (evt: DragEvent) {
        let files : any[];
        let loadFiles : any[] = [];
        let paths : string[] = [];
        if (this.active) {
            evt.preventDefault();
            files = evt.dataTransfer.files as any; //squashes ts error
            for (let file of files) {
                loadFiles.push(new Promise((resolve : any, reject : any) => {
                    let fileReader : FileReader = new FileReader();
                    fileReader.onload = (function(file : any) {
                        paths.push(file.path);
                        return resolve(file);
                    })(file) as any; //dirty ts hack
                    fileReader.readAsDataURL(file);
                }));
            }
            try {
                await Promise.all(loadFiles)
            } catch (err) {
                console.error(err);
            }
            f.determineProcess(paths[0]);

        }
        this.leave(evt);
    }

    private containsFiles (evt : DragEvent) {
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
    public async select () {
        const options : any = {
            title: `Select video, image or audio file`,
            properties: [`openFile`],
            defaultPath: 'c:/',
            filters: [
                {
                    name: 'All Files',
                    extensions: ['*']
                },
            ]
        };
        let files : any;
        let filePath : string;
        
        try {
            files = await dialog.showOpenDialog(options);
        } catch (err ) {
            console.error(err);
        }

        if (!files || !files.filePaths || files.filePaths.length === 0) {
            return false;
        }

        filePath = files.filePaths[0];

        this.determineProcess(filePath);
    }


    public async determineProcess (filePath : string) {
        let valid : boolean = true;
        let type : string = 'video';
        let stats : any;
        let ext : string;

        /*
        try {
            stats = await lstat(filePath);
        } catch (err) {
            console.error(err);
            return false;
        }*/

        ext = extname(filePath.toLowerCase());
        //console.log(ext)
        if (videoExtensions.indexOf(ext) > -1 || stillExtensions.indexOf(ext) > -1) {
            valid = true;
        }

        if (!valid) {
            console.log(`File selection is not valid`)
            return false;
        }

        if (stillExtensions.indexOf(ext) > -1) {
            type = 'still';
        } else if (audioExtensions.indexOf(ext) > -1) {
            type = 'audio';
        } else if (midiExtensions.indexOf(ext) > -1) {
            type = 'midi';
        }

        if (type === 'video' || type === 'still') {
            ui.page('sonify');
            this.setSonify(filePath, type);
        } else if (type === 'audio' || type === 'midi') {
            ui.page('visualize');
            this.setVisualize(filePath, type);
        }        
    }

    public async setSonify (filePath : string, type : string ) {
        const elem : HTMLInputElement = fileSourceProxy;
        let displayName : string;

        displayName = video.set(filePath, type);
        ipcRenderer.send('info', { filePath, type } );

        state.set('filePath', filePath );
        state.set('type', type );

        elem.value = displayName;

        sonifyStart();
    }

    public async setVisualize (filePath : string, type : string) {
        const elem : HTMLInputElement = vFileSourceProxy;
        let displayName : string;

        displayName = visualize.set(filePath, type);
        
        state.set('filePath', filePath );
        state.set('type', type);

        elem.value = displayName;
        
        visualizeStart();
    }

    public async saveAudio (filePath : string) {
        const options : any = {
            defaultPath: homedir()
        };
        let savePath : any;

        try {
            savePath = await dialog.showSaveDialog(null, options)
        } catch (err) {
            console.error(err);
        }

        if (savePath) {
            savePath.filePath = await this.validatePathAudio(savePath.filePath);
            ipcRenderer.send('save', { filePath, savePath });
        }
    }

    public async validatePathAudio (savePath : string) {
        const saveExt : string = '.wav';
        const ext : string = extname(savePath);
        let proceed : boolean = false;
        let i : number;
        if (ext === '') {
            savePath += saveExt;
        } else if (ext.toLowerCase() !== saveExt) {
            try {
                proceed = await confirm(`Sonification file is a WAVE but has the extension "${ext}". Keep extension and continue?`);
            } catch (err) {
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

    public async saveVideo (filePath : string) {
        const options : any = {
            defaultPath: homedir()
        };
        let savePath : any;

        try {
            savePath = await dialog.showSaveDialog(null, options)
        } catch (err) {
            console.error(err);
        }

        if (savePath) {
            savePath.filePath = await this.validatePathVideo(savePath.filePath);
            ipcRenderer.send('save', { filePath, savePath });
        }
    }

    public async validatePathVideo (savePath : string) {
        const saveExt : string = '.mp4';
        const ext : string = extname(savePath);
        let proceed : boolean = false;
        let i : number;

        if (ext === '') {
            savePath += saveExt;
        } else if (ext.toLowerCase() !== saveExt) {
            try {
                proceed = await confirm(`The exported video is an MP4 wrapper but has the extension "${ext}". Keep extension and continue?`);
            } catch (err) {
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

const audioCtx : AudioContext = new window.AudioContext();

async function sonifyStart () {
    const sonifyState : any = state.get();
    const displayName : string = video.displayName;
    let proceed : boolean = false;

    try {
        proceed = await confirm(`Sonify ${displayName}? This may take a while.`);
    } catch (err) {
        console.log(err);
    }

    if (!proceed) {
        return false;
    }

    timeAvg = -1;
    avgMs = -1;

    ui.overlay.show(`Exporting frames from ${displayName}...`);
    ui.overlay.progress(0, `Determining time left...`);
    ipcRenderer.send('sonify', { state : sonifyState });
}

async function onStartSonify () {
    ui.overlay.show(`Sonifying ${video.displayName}...`);
    ui.overlay.progress(0, `Determining time left...`);
}

async function sonifyCancel () {
    let proceed : boolean = false;
    
    try {
        proceed = await confirm(`Are you sure you want to cancel?`);
    } catch (err) {
        console.log(err);
    }

    if (!proceed) {
        return false;
    }

    ipcRenderer.send('cancel', { });
}

function onSonifyProgress (evt : Event, args : any) {
    let timeLeft : number;
    let timeStr : string;

    if (avgMs !== -1) {
        avgMs = (avgMs + args.ms) / 2.0;
    } else {
        avgMs = args.ms;
    }

    timeLeft = (args.frames - args.i) * avgMs;

    if (timeAvg !== -1) {
        timeAvg = (timeAvg + timeLeft) / 2.0;
    } else {
        timeAvg = timeLeft;
    }

    timeStr = humanizeDuration(Math.round(timeAvg / 1000) * 1000);
    ui.overlay.progress(args.i / args.frames, `~${timeStr}`);
}

function onSonifyComplete (evt : Event, args : any) {
    avgMs = -1;
    timeAvg = -1;
    ui.overlay.hide();
    f.saveAudio(args.tmpAudio);
}

function onCancel (evt : Event, args : any) {
    avgMs = -1;
    timeAvg = -1;
    ui.overlay.hide();
}

function sonifyFrame () {
    const source : any = audioContext.createBufferSource();
    let buf : any = audioContext.createBuffer(1, video.height, video.samplerate);
    let mono : any = buf.getChannelData(0);
    let tmp : Float32Array;

    sonifyFrameBtn.classList.add('active');

    sonify = new Sonify(state, video.canvas, audioContext);

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
        } catch (err) {
            //
        }
    }, 42);
}

async function visualizeStart () {
    let type : string = state.get('type');
    sonifyVisualizeBtn.removeAttribute('disabled');
    visualizeExportBtn.removeAttribute('disabled');
    if (type === 'midi') {
        await visualize.processMidi();
        visualize.decodeMidi(0);
    } else if (type === 'audio') {
        processAudio();
    }
}

function sonifyVisualizeFrame () {
    const source : any = audioContext.createBufferSource();
    let buf : any = audioContext.createBuffer(1, visualize.height, visualize.samplerate);
    let mono : any = buf.getChannelData(0);
    let tmp : Float32Array;

    sonifyVisualizeBtn.classList.add('active');

    tmp = visualize.sonify.sonifyCanvas();
    tmp = visualize.sonify.envelope(tmp, 100);
    mono.set(tmp, 0);

    source.buffer = buf;
    source.connect(audioContext.destination);
    source.start();

    setTimeout(() => {
        try {
            sonifyVisualizeBtn.classList.remove('active');
        } catch (err) {
            //
        }
    }, 42);
}

async function visualizeExportStart () {
    return new Promise((resolve, reject) => {
        ipcRenderer.once('visualize_start', (evt : Event, args : any) => {
            if (typeof args.success !== 'undefined' && args.success === true) {
                return resolve(true);
            }
            return reject('Failed to start');
        });
        ipcRenderer.send('visualize_start', {});
    });
}

function visualizeExportProgress (frameNumber : number, ms : number) {
    let timeLeft : number;
    let timeStr : string;

    if (avgMs !== -1) {
        avgMs = (avgMs + ms) / 2.0;
    } else {
        avgMs = ms;
    }

    timeLeft = (visualize.frames.length - frameNumber) * avgMs;

    if (timeAvg !== -1) {
        timeAvg = (timeAvg + timeLeft) / 2.0;
    } else {
        timeAvg = timeLeft;
    }

    timeStr = humanizeDuration(Math.round(timeAvg / 1000) * 1000);
    ui.overlay.progress(frameNumber / visualize.frames.length, `~${timeStr}`);
}

async function visualizeExportFrame (frameNumber : number, data : any, width : number, height : number) {
    return new Promise((resolve, reject) => {
        ipcRenderer.once('visualize_frame', (evt : Event, args : any) => {
            if (typeof args.success !== 'undefined' && args.success === true) {
                visualizeExportProgress(args.frameNumber, args.ms);
                return resolve(true);
            }
            return reject('Failed to export');
        });
        ipcRenderer.send('visualize_frame', { frameNumber, data , width, height });
    });
}

async function visualizeExportEnd () : Promise<string> {
    return new Promise((resolve, reject) => {
        ipcRenderer.once('visualize_end', (evt : Event, args : any) => {
            if (typeof args.success !== 'undefined' && args.success === true) {
                return resolve(args.tmpVideo);
            }
            return reject('Failed to export');
        });
        ipcRenderer.send('visualize_end', {  });
    });
}

async function visualizeExport () {
    const width : number = visualize.width;
    const height : number = visualize.height;
    let frameData : any;
    let tmpVideo : string;

    if (visualize.frames.length > 0) {
        ui.overlay.show(`Exporting visualization of ${visualize.displayName}...`);

        avgMs = -1;
        timeAvg = -1;

        try {
            await visualizeExportStart();
        } catch (err) {
            console.error(err);
            return false;
        }

        for (let i : number = 0; i < visualize.frames.length; i++) {
            frameData = visualize.exportFrame(i);
            try {
                await visualizeExportFrame(i, frameData.data, width, height);
            } catch (err) {
                console.error(err);
                ui.overlay.hide();
                return false;
            }
        }

        avgMs = -1;
        timeAvg = -1;

        ui.overlay.show(`Exporting video of ${visualize.displayName}...`);
        ui.overlay.progress(0, `N/A`);

        try {
            tmpVideo = await visualizeExportEnd();
        } catch (err) {
            console.error(err);
            ui.overlay.hide();
            return false;
        }

        avgMs = -1;
        timeAvg = -1;
        ui.overlay.hide();
        f.saveVideo(tmpVideo);

    }
}

function processAudio () {
    const visualizeState : any = state.get();
    ui.overlay.show(`Preparing audio file ${visualize.displayName}...`);
    ipcRenderer.send('process_audio', { state : visualizeState });
}

function playSync () {
    video.play();
    //audio.play();
}

function keyDown (evt : KeyboardEvent) {
    if (ui.currentPage === 'sonify') {
        if (evt.code === 'Space') {
            video.play();
        } else if (evt.code === 'ArrowLeft') {
            video.prevFrame();
        } else if (evt.code === 'ArrowRight') {
            video.nextFrame();
        } else if (evt.code === 'KeyF') {
            sonifyFrame();
        } else if (evt.code === 'KeyI') {

        } else if (evt.code === 'KeyO') {

        }
    } else if (ui.currentPage === 'visualize') {
        if (evt.code === 'ArrowLeft') {
            visualize.prevFrame();
        } else if (evt.code === 'ArrowRight') {
            visualize.nextFrame();
        } 
    }
    console.log(evt.code);
}

function bindListeners () {
    dropArea = document.getElementById('dragOverlay');
    fileSourceProxy = document.getElementById('fileSourceProxy') as HTMLInputElement;
    vFileSourceProxy = document.getElementById('vFileSourceProxy') as HTMLInputElement;
    sonifyFrameBtn = document.getElementById('sonifyFrame') as HTMLButtonElement;
    sonifyVideo = document.getElementById('sonifyVideo') as HTMLButtonElement;
    sonifyBtn = document.getElementById('sonifyBtn');
    sonifyCancelBtn = document.getElementById('sonifyCancel');
    visualizeBtn = document.getElementById('visualizeBtn');
    sonifyVisualizeBtn = document.getElementById('sonifyVisualizeBtn') as HTMLButtonElement;
    visualizeExportBtn = document.getElementById('visualizeExportBtn') as HTMLButtonElement;

    sonifyBtn.addEventListener('click', function () { ui.page('sonify'); }, false);
    sonifyCancelBtn.addEventListener('click', sonifyCancel, false);
    visualizeBtn.addEventListener('click', function () { ui.page('visualize'); }, false);
    sonifyVisualizeBtn.addEventListener('click', sonifyVisualizeFrame, false);
    visualizeExportBtn.addEventListener('click', visualizeExport, false);

    fileSourceProxy.addEventListener('click', f.select.bind(f), false);
    vFileSourceProxy.addEventListener('click', f.select.bind(f), false);
    sonifyFrameBtn.addEventListener('click', sonifyFrame, false);
    sonifyVideo.addEventListener('click', sonifyStart, false);
    document.addEventListener('keydown', keyDown, false);

    ipcRenderer.on('sonify_complete', onSonifyComplete);
    ipcRenderer.on('sonify_sonify', onStartSonify);
    ipcRenderer.on('sonify_progress', onSonifyProgress);
    ipcRenderer.on('cancel', onCancel);

    ipcRenderer.on('info', (evt : Event, args : any) => {
        video.oninfo(evt, args);
        sonify = new Sonify(state, video.canvas, audioContext);
    });
    ipcRenderer.on('process_audio', (evt : Event, args : any) => {
        visualize.onProcessAudio(evt, args);
        ui.overlay.hide();
    });
}

/**
 * VISUALIZE
 **/


(async function main () {

    dnd = new DragDrop();
    f = new Files();
    audioContext = new AudioContext();

    //@ts-ignore why are you like this
    state = new State();

    try {
        await state.start()
    } catch (err) {
        console.error(err)
    }

    //@ts-ignore
    ui = new UI(state);
    video = new Video(state, ui);
    camera = new Camera(video);
    sonify = new Sonify(state, video.canvas, audioContext); //need to refsth when settings change
    visualize = new Visualize(state, audioContext);

    bindListeners();

})()