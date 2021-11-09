'use strict';

import { basename, extname, join, dirname } from 'path';
import { homedir } from 'os';

const { ipcRenderer } = require('electron');
const { dialog } = require('electron').remote;

const humanizeDuration = require('humanize-duration');

const videoExtensions : string[] = ['.avi', '.mp4', '.mkv', '.mpg', '.mpeg', '.mov', '.m4v', '.ogg', '.webm'];
const stillExtensions : string[] = ['.png', '.jpg', '.jpeg', '.gif'];
const midiExtensions : string[] = ['.mid', '.midi'];
const audioExtensions : string[] = ['.mp3', '.aiff', '.aif',  '.wav', '.wave'];
const videoFormatMap : any = {
    'prores3' : '.mov',
    'h264' : '.mp4'
};
let lastDir : string = '';

let startMoving : boolean = false;
let endMoving : boolean = false;

let audioContext : AudioContext;
let state : State;
let video : Video;
let sonify : Sonify;
let visualize : Visualize;
let timeline : Timeline;
let ui : any;

let avgMs : number = -1;
let timeAvg : number = -1;
let dnd : DragDrop;
let f : Files;

let CANCEL : boolean = false;

/* ELEMENTS */

let dropArea : HTMLElement;
let fileSourceProxy : HTMLElement;
let clickSelect : HTMLElement;
let vFileSourceProxy : HTMLInputElement;
let sonifyFrameBtn : HTMLButtonElement;
let sonifyVideo : HTMLButtonElement;
let sonifyBtn : HTMLElement;
let cancelBtn : HTMLElement;
let visualizeBtn : HTMLElement;
let sonifyVisualizeBtn : HTMLButtonElement;
let visualizeExportBtn : HTMLButtonElement;
let timelineBtn : HTMLElement;
let timelineExportBtn : HTMLButtonElement;
let syncBtn : HTMLButtonElement;

/**
 * Bind an event to an element whether or not it exists yet.
 * 
 * @param {string} selector     Query selector of the element
 * @param {string} event         Name of event
 * @param {Function} handler     Callback function bound to element
 **/
function bindGlobal (selector : string, event : string, handler : Function) {
    const rootElement : HTMLElement = document.querySelector('body');
    rootElement.addEventListener(event, function (evt : Event) {
            let targetElement : any = evt.target;
            while (targetElement != null) {
                if (targetElement.matches(selector)) {
                    handler(evt);
                    return;
                }
                targetElement = targetElement.parentElement;
            }
        },
        true
    );
}

/**
 * Display a confirm dialog with a yes or no selection.
 * 
 * @param {string} message     Message to confirm
 * 
 * @returns {boolean} Whether or not user selected to confirm
 **/
async function confirm (message : string) : Promise<boolean> {
    const config = {
        buttons : ['Yes', 'No'],
        message
    };
    const res = await dialog.showMessageBox(config);
    return res.response === 0;
}

/* class representing the Drag and Drop functionality */
class DragDrop {
    private active : boolean = false;
    private overlay : HTMLElement;

    /**
     * @constructor
     * 
     * Assigns dragOverlay element to member overlay
     **/
    constructor () {
        this.overlay = document.getElementById('dragOverlay');
    }

    /**
     * Called when a file is dragged into the dragOverlay element
     * 
     * @param {object} evt     Drag event object
     **/
    public enter (evt: DragEvent) {
        let files : any[];
        evt.preventDefault();
        if (this.containsFiles(evt)) {
            this.active = true;
            this.overlay.classList.add('show');
        }
    }

    /**
     * Called when file is dragged over element
     * 
     * @param {object} evt     Drag event object
     **/
    public over (evt: DragEvent) {
        evt.preventDefault();
    }

    /**
     * Called when file leaves drag area
     * 
     * @param {object} evt     Drag event object
     **/
    public leave (evt: Event) {
        if (this.active) this.active = false;
        try {
            this.overlay.classList.remove('show');
        } catch (err) {
            console.error(err);
        }
    }

    /**
     * Called when file is dropped over element
     * 
     * @param {object} evt     Drag event object
     **/
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

            if (ui.currentPage === 'timeline') {
                timeline.addToBin(paths);
            } else {
                f.determineProcess(paths[0]);
            }
        }
        this.leave(evt);
    }

    /**
     * Determines if files were dragged into element
     * 
     * @param {object} evt     Drag event object
     * 
     * @returns {boolean} Whether or not dropped event contains files
     **/
    private containsFiles (evt : DragEvent) : boolean {
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

/* class representing File i/o functionality */
class Files {
    /**
     * Display the file selection dialog for the sonify and visualize
     * workspaces. Timeline uses its own process because the file 
     * workflow is different.
     **/
    public async select () {
        const options : any = {
            title: `Select video, image or audio file`,
            properties: [`openFile`],
            defaultPath: lastDir === '' ? homedir() : lastDir,
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

    /**
     * Differentiates between files intended for sonify or 
     * visualize workspace based on type. Looks at extention
     * and then applies file to the appropriate workspace.
     * 
     * @param {string} filePath         Path of file to determine process for
     **/
    public async determineProcess (filePath : string) {
        let valid : boolean = true;
        let type : string = 'video';
        let ext : string;

        ext = extname(filePath.toLowerCase());

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

        lastDir = dirname(filePath);      
    }

    /**
     * Sets the UI and state to sonify based on the image input
     * as determined by method determineProcess().
     * 
     * @param {string} filePath     Path of file to sonify
     * @param {string} type         Type of file (video/still)
     **/
    public async setSonify (filePath : string, type : string ) {
        const elem : HTMLElement = fileSourceProxy;
        let displayName : string;

        displayName = video.set(filePath, type);
        ipcRenderer.send('info', { filePath, type } );

        state.set('filePath', filePath );
        state.set('type', type );

        elem.innerHTML = displayName;
    }

    /**
     * Set the UI and state to visualize based on the audio file
     * input as determines by method determineProcess().
     * 
     * @param {string} filePath     Path of audio file to visualize
     * @param {string} type         Type of file to visualize
     **/
    public async setVisualize (filePath : string, type : string) {
        const elem : HTMLInputElement = vFileSourceProxy;
        let displayName : string;

        displayName = visualize.set(filePath, type);
        
        state.set('filePath', filePath );
        state.set('type', type);

        elem.innerHTML = displayName;
        document.getElementById('vInfo').classList.remove('hide');
        
        visualizeStart();
    }

    /**
     * Save an audio file after it has been exported from the sonification
     * process.
     * 
     * @param {string} filePath         Path of temporary audio file to save
     **/
    public async saveAudio (filePath : string) {
        const options : any = {
            defaultPath: lastDir === '' ? homedir() : lastDir,
        };
        let savePath : any;

        try {
            savePath = await dialog.showSaveDialog(null, options)
        } catch (err) {
            console.error(err);
        }

        if (savePath) {
            savePath.filePath = await this.validatePathAudio(savePath.filePath);
            lastDir = dirname(savePath.filePath);
            ipcRenderer.send('save', { filePath, savePath });
        }
    }

    /**
     * Validate the path and filename of an audio file being saved.
     * Enforce the .wav extension but allow the user to override.
     * 
     * @param {string} savePath         Path to save the file to
     * 
     * @returns {string} Final path to save file to
     **/
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

    /**
     * Save a video file from the visualization process.
     * 
     * @param {string} filePath      Path to temporary video file
     **/
    public async saveVideo (filePath : string) {
        const options : any = {
            defaultPath: lastDir === '' ? homedir() : lastDir
        };
        let savePath : any;

        try {
            savePath = await dialog.showSaveDialog(null, options)
        } catch (err) {
            console.error(err);
        }

        if (savePath) {
            savePath.filePath = await this.validatePathVideo(savePath.filePath);
            lastDir = dirname(savePath.filePath);
            ipcRenderer.send('save', { filePath, savePath });
        }
    }

    /**
     * Validate the path and filename of an video file being saved.
     * Enforce the correct extension but allow the user to override.
     * 
     * @param {string} savePath         Path to save the file to
     * 
     * @returns {string} Final path to save file to
     **/
    public async validatePathVideo (savePath : string) {
        const saveExt : string = videoFormatMap[visualize.format];
        const ext : string = extname(savePath);
        let proceed : boolean = false;
        let i : number;

        if (ext === '') {
            savePath += saveExt;
        } else if (ext.toLowerCase() !== saveExt) {

            try {
                proceed = await confirm(`The exported video is in a ${saveExt} wrapper but has the extension "${ext}". Keep extension and continue?`);
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

const syncPreviewState = {
    rendered : false,
    rendering : false
};

/**
 * COMMON FUNCTIONS
 **/

/**
 * Cancel any process that has a blocking UI overlay.
 * Bound to the "Cancel" button. Sends IPC message to
 * main process to cancel background jobs and subprocesses.
 **/
function cancel () {
    CANCEL = true;
    ipcRenderer.send('cancel', { });
}

/**
 * Called when cancellation message has been received from
 * IPC.
 * 
 * @param {object} evt     IPC event object
 * @param {object} args    IPC arguments object
 **/
function onCancel (evt : Event, args : any) {
    console.log('Cancellation confirmed');
    avgMs = -1;
    timeAvg = -1;
    ui.overlay.hide();
    CANCEL = false;
}

/**
 * Display a confirm dialog before cancelling.
 **/
async function confirmCancel () {
    let proceed : boolean = false;
    
    try {
        proceed = await confirm(`Are you sure you want to cancel?`);
    } catch (err) {
        console.log(err);
    }

    if (!proceed) {
        return false;
    }

    cancel();
}

/**
 * SONIFY FUNCTIONS
 **/

function onInfo  (evt : Event, args : any) {
    let preview : boolean = video.onInfo(evt, args);

    if (!preview) {
        sonify = new Sonify(state, video.canvas, audioContext);
    } else {
        //generate preview for sonify, if needed
        previewStart();
    }
    syncBtn.removeAttribute('disabled');
}

function previewProgress (frameNumber : number, ms : number) {
    let timeLeft : number;
    let timeStr : string;

    if (avgMs !== -1) {
        avgMs = (avgMs + ms) / 2.0;
    } else {
        avgMs = ms;
    }

    timeLeft = (video.frames - frameNumber) * avgMs;

    if (timeAvg !== -1) {
        timeAvg = (timeAvg + timeLeft) / 2.0;
    } else {
        timeAvg = timeLeft;
    }

    timeStr = humanizeDuration(Math.round(timeAvg / 1000) * 1000);
    ui.overlay.progress(frameNumber / video.frames, `~${timeStr}`);
}

function onPreviewProgress (evt : Event, args : any) {
    previewProgress(args.frameNumber, args.ms);
}

async function previewStart () {
    const filePath : any = state.get('filePath');
    const displayName : string = video.displayName;
    const width : number = video.width;
    const height : number = video.height;
    let proceed : boolean = false;

    try {
        proceed = await confirm(`To view the video ${displayName} a proxy must be rendered. Do you wish to proceed?`);
    } catch (err) {
        console.log(err);
    }

    if (!proceed) {
        return false;
    }

    timeAvg = -1;
    avgMs = -1;

    ui.overlay.show(`Rendering proxy of ${displayName}...`);
    ui.overlay.progress(0, `Determining time left...`);

    ipcRenderer.send('preview', { filePath, width, height });
}

function onPreview (evt : Event, args : any){
    video.previewFile(args.tmpVideo);
    setTimeout( () => {
        sonify = new Sonify(state, video.canvas, audioContext);
        ui.overlay.hide();
    }, 100);
}

function onSync (evt : Event) {
    if (!syncPreviewState.rendering && !syncPreviewState.rendered) {
        syncPreviewStart();
    } else if (syncPreviewState.rendered) {
        if (!video.playing) {
            video.play();
        } else {
            video.pause();
        }
    }
}

function syncPreviewStart () {
    const sonifyState : any = state.get();
    const filePath : any = state.get('filePath');
    const displayName : string = video.displayName;
    const width : number = video.displayWidth;
    const height : number = video.displayHeight;
    const args : any = { 
        state : sonifyState,
        save : false,
        filePath, 
        width, 
        height 
    };

    timeAvg = -1;
    avgMs = -1;

    ui.overlay.show(`Rendering synchronized preview of ${displayName}...`);
    ui.overlay.progress(0, `Determining time left...`);

    ipcRenderer.send('sync_preview', args);
    syncPreviewState.rendering = true;
    syncPreviewState.rendered = false;
    //@ts-ignore
    showSpinner('syncSpinner', 'small');
    syncBtn.classList.add('rendering');
}

function onSyncPreview (evt : Event, args : any) {
    avgMs = -1;
    timeAvg = -1;
    ui.overlay.hide();
    video.previewFile(args.tmpVideo, true);
    syncPreviewState.rendering = false;
    syncPreviewState.rendered = true;
    syncBtn.classList.remove('rendering');
    video.play();
}

async function sonifyStart () {
    const sonifyState : any = state.get();
    const displayName : string = video.displayName;
    const args : any = { 
        state : sonifyState,
        save : true
    };


    timeAvg = -1;
    avgMs = -1;

    ui.overlay.show(`Exporting frames from ${displayName}...`, true);
    ui.overlay.progress(0, `Determining time left...`);
    ipcRenderer.send('sonify', args );
}

async function onStartSonify () {
    ui.overlay.show(`Sonifying ${video.displayName}...`, true);
    ui.overlay.progress(0, `Determining time left...`);
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

/**
 * VISUALIZE FUNCTIONS
 **/

async function visualizeStart () {
    let type : string = state.get('type');
    sonifyVisualizeBtn.removeAttribute('disabled');
    visualizeExportBtn.removeAttribute('disabled');
    document.getElementById('vDropMessage').classList.add('hide');
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

async function visualizeExportStart (format : string) {
    return new Promise((resolve, reject) => {
        ipcRenderer.once('visualize_start', (evt : Event, args : any) => {
            if (typeof args.success !== 'undefined' && args.success === true) {
                return resolve(true);
            }
            return reject('Failed to start');
        });
        ipcRenderer.send('visualize_start', { format });
    });
}

function visualizeExportProgress (frameNumber : number, ms : number) {
    const total : number = visualize.frames.length;
    let timeLeft : number;
    let timeStr : string;

    if (avgMs !== -1) {
        avgMs = (avgMs + ms) / 2.0;
    } else {
        avgMs = ms;
    }

    timeLeft = (total - frameNumber) * avgMs;

    if (timeAvg !== -1) {
        timeAvg = (timeAvg + timeLeft) / 2.0;
    } else {
        timeAvg = timeLeft;
    }

    timeStr = humanizeDuration(Math.round(timeAvg / 1000) * 1000);
    ui.overlay.progress(frameNumber / total, `~${timeStr}`);
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

function onVisualizeProgress (evt : Event, args : any) {
    visualizeExportProgress(args.frameNumber, args.ms);
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
    const format : string = visualize.format;
    let frameData : any;
    let tmpVideo : string;

    CANCEL = false;

    if (visualize.frames.length > 0) {
        ui.overlay.show(`Exporting frames of ${visualize.displayName}...`, true);
        ui.overlay.progress(0, `Determining time left...`);

        avgMs = -1;
        timeAvg = -1;

        try {
            await visualizeExportStart(format);
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
            if (CANCEL) {
                CANCEL = false;
                ui.overlay.hide();
                return false;
            }
        }

        avgMs = -1;
        timeAvg = -1;

        ui.overlay.show(`Exporting video of ${visualize.displayName}...`, true);
        ui.overlay.progress(0, `Determining time left...`);

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

async function visualizePreviewStart () {
    return new Promise((resolve, reject) => {
        ipcRenderer.once('visualize_preview_start', (evt : Event, args : any) => {
            if (typeof args.success !== 'undefined' && args.success === true) {
                return resolve(true);
            }
            return reject('Failed to start preview');
        });
        ipcRenderer.send('visualize_preview_start', {});
    });
}

async function visualizePreviewEnd (options : any) : Promise<string> {
    return new Promise((resolve, reject) => {
        ipcRenderer.once('visualize_preview_end', (evt : Event, args : any) => {
            if (typeof args.success !== 'undefined' && args.success === true) {
                return resolve(args.tmpVideo);
            }
            return reject('Failed to export preview');
        });
        ipcRenderer.send('visualize_preview_end', { options } );
    });
}

async function visualizePreview () {
    const oWidth : number = visualize.width;
    const oHeight : number = visualize.height;
    const width : number = visualize.displayWidth;
    const height : number = visualize.displayHeight;
    let frameData : any;
    let tmpVideo : string;

    CANCEL = false;

    if (visualize.frames.length > 0) {
        ui.overlay.show(`Exporting frames of ${visualize.displayName} for preview...`, true);
        ui.overlay.progress(0, `Determining time left...`);

        avgMs = -1;
        timeAvg = -1;

        try {
            await visualizePreviewStart();
        } catch (err) {
            console.error(err);
            return false;
        }

        for (let i : number = 0; i < visualize.frames.length; i++) {
            frameData = visualize.exportFrame(i);
            try {
                await visualizeExportFrame(i, frameData.data, oWidth, oHeight);
            } catch (err) {
                console.error(err);
                ui.overlay.hide();
                return false;
            }
            if (CANCEL) {
                CANCEL = false;
                ui.overlay.hide();
                return false;
            }
        }

        avgMs = -1;
        timeAvg = -1;

        ui.overlay.show(`Exporting video of ${visualize.displayName}...`, true);
        ui.overlay.progress(0, `Determining time left...`);

        try {
            tmpVideo = await visualizePreviewEnd({ width, height });
        } catch (err) {
            console.error(err);
            ui.overlay.hide();
            return false;
        }

        avgMs = -1;
        timeAvg = -1;
        ui.overlay.hide();

        visualize.onPreview(tmpVideo);
    }
}

function processAudio () {
    const visualizeState : any = state.get();
    ui.overlay.show(`Preparing audio file ${visualize.displayName}...`);
    ui.overlay.progress(0, `Determining time left...`);
    ipcRenderer.send('process_audio', { state : visualizeState });
    avgMs = -1;
    timeAvg = -1;
}

function processAudioProgress (frameNumber : number, ms : number) {
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

function onProcessAudioProgress (evt : Event, args : any) {
    processAudioProgress(args.frameNumber, args.ms);
}

/**
 * TIMELINE FUNCTIONS
 **/

function timelineExport () {
    let tl : string[] = timeline.export();
    timelineExportBtn.blur();
    if (tl.length > 0) {
        ui.overlay.show(`Exporting ${tl.length} frame Timeline...`);
        ui.overlay.progress(0, `Determining time left...`);
        avgMs = -1;
        timeAvg = -1;
        ipcRenderer.send('timeline_export', { timeline : tl });
    }
}

function onTimelineExportProgress (evt : Event, args : any) {
    timelineExportProgress(args.ms, args.frameNumber);
}

function timelineExportProgress (ms : number, frameNumber : number) {
    const total : number = timeline.timeline.length;
    let timeLeft : number;
    let timeStr : string;

    if (avgMs !== -1) {
        avgMs = (avgMs + ms) / 2.0;
    } else {
        avgMs = ms;
    }

    timeLeft = (total - frameNumber) * avgMs;

    if (timeAvg !== -1) {
        timeAvg = (timeAvg + timeLeft) / 2.0;
    } else {
        timeAvg = timeLeft;
    }

    timeStr = humanizeDuration(Math.round(timeAvg / 1000) * 1000);
    ui.overlay.progress(frameNumber / total, `~${timeStr}`);
}

function onTimelineExportComplete (evt : Event, args : any) {
    ui.overlay.hide();
    if (args.success) {
        f.saveVideo(args.tmpVideo);
    }
}

function keyDown (evt : KeyboardEvent) {
    if (ui.currentPage === 'sonify') {
        if (evt.code === 'Space') {
            //video.play();
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
        } else if (evt.code === 'KeyF') {
            sonifyVisualizeFrame();
        } 
    } else if (ui.currentPage === 'timeline') {
        //timeline key commands handled by Timeline class
        return false;
    }
    console.log(evt.code);
}

function onTimelineBin (bi : any, image : any) {
    ipcRenderer.send('bin', { bi, image } );
}

function onTimelinePreview () {
    let settings : any = timeline.preview();
    if (settings.timeline.length > 0) {
        ipcRenderer.send('timeline_preview', settings );
    }
}

function onTimelinePreviewComplete (evt : Event, args : any) {
    timeline.onPreviewComplete(args);
}

async function onProcessAudio (evt : Event, args : any) {
    if (args.success === true) {
        await visualize.onProcessAudio(evt, args);
    } else {
        alert('Error processing audio file.');
    }
    ui.overlay.hide();
}

function bindListeners () {
    dropArea         = document.getElementById('dragOverlay');
    fileSourceProxy  = document.getElementById('fileSourceProxy');
    clickSelect      = document.getElementById('clickSelect');
    vFileSourceProxy = document.getElementById('vFileSourceProxy') as HTMLInputElement;
    sonifyFrameBtn   = document.getElementById('sonifyFrame') as HTMLButtonElement;
    sonifyVideo      = document.getElementById('sonifyVideo') as HTMLButtonElement;
    sonifyBtn        = document.getElementById('sonifyBtn');
    syncBtn          = document.getElementById('sync') as HTMLButtonElement;
    
    visualizeBtn = document.getElementById('visualizeBtn');
    sonifyVisualizeBtn = document.getElementById('sonifyVisualizeBtn') as HTMLButtonElement;
    visualizeExportBtn = document.getElementById('visualizeExportBtn') as HTMLButtonElement;
    timelineBtn = document.getElementById('timelineBtn');
    timelineExportBtn = document.getElementById('tExport') as HTMLButtonElement;

    cancelBtn = document.getElementById('cancel');

    sonifyBtn.addEventListener('click', function () { ui.page('sonify'); }, false);
    visualizeBtn.addEventListener('click', function () { ui.page('visualize'); }, false);
    sonifyVisualizeBtn.addEventListener('click', sonifyVisualizeFrame, false);
    visualizeExportBtn.addEventListener('click', visualizeExport, false);
    timelineBtn.addEventListener('click', function () { ui.page('timeline'); }, false);
    timelineExportBtn.addEventListener('click', timelineExport, false);

    clickSelect.addEventListener('click', f.select.bind(f), false);
    document.getElementById('vDropMessage').addEventListener('click', f.select.bind(f), false);
    document.getElementById('vInfo').addEventListener('click', f.select.bind(f), false);
    sonifyFrameBtn.addEventListener('click', sonifyFrame, false);
    sonifyVideo.addEventListener('click', sonifyStart, false);
    document.addEventListener('keydown', keyDown, false);

    cancelBtn.addEventListener('click', confirmCancel, false);
    syncBtn.addEventListener('click', onSync, false);

    ipcRenderer.on('sonify_complete', onSonifyComplete);
    ipcRenderer.on('sonify_sonify', onStartSonify);
    ipcRenderer.on('sonify_progress', onSonifyProgress);
    ipcRenderer.on('cancel', onCancel);

    ipcRenderer.on('visualize_progress', onVisualizeProgress);

    ipcRenderer.on('info', onInfo);

    ipcRenderer.on('preview_progress', onPreviewProgress);
    ipcRenderer.on('preview', onPreview);
    ipcRenderer.on('sync_preview', onSyncPreview);

    ipcRenderer.on('process_audio', onProcessAudio);

    ipcRenderer.on('progress_audio_progress', onProcessAudioProgress, false);

    ipcRenderer.on('timeline_export_complete', onTimelineExportComplete, false);
    ipcRenderer.on('timeline_export_progress', onTimelineExportProgress, false);

    ipcRenderer.on('timeline_preview_complete', onTimelinePreviewComplete, false);
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
    sonify = new Sonify(state, video.canvas, audioContext); //need to refresh when settings change
    visualize = new Visualize(state, audioContext);
    timeline = new Timeline(ui, onTimelineBin, onTimelinePreview);

    bindListeners();

})()