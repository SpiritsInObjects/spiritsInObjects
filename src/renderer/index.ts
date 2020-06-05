'use strict';

import { extname } from 'path';
import { homedir } from 'os';

const { ipcRenderer } = require('electron');
const { dialog } = require('electron').remote;

const humanizeDuration = require('humanize-duration');

const extensions : string[] = ['.mp4', '.mkv', '.mpg', '.mpeg'];
let startMoving : boolean = false;
let endMoving : boolean = false;

let audioContext : AudioContext;
let state : State;
let video : Video;
let camera : Camera;
let sonify : Sonify;
let ui : any;

let avgMs : number = -1;
let timeAvg : number = -1;
const progressBar : any = document.getElementById('overlayProgressBar');
const progressMsg : any = document.getElementById('overlayProgressMsg');

(async function main () {

    async function confirm (message : string) {
        const config = {
            buttons : ['Yes', 'Cancel'],
            message
        }
        const res = await dialog.showMessageBox(config);
        return res.response === 0;
    };

    function overlayShow (msg : string = '') {
        showSpinner('overlaySpinner');
        document.getElementById('overlayMsg').innerText = msg;
        document.getElementById('overlay').classList.add('show');
    }
    
    function overlayHide () {
        try {
            document.getElementById('overlay').classList.remove('show');
        } catch (err) {
            console.error(err);
        }
        document.getElementById('overlayMsg').innerText = '';
        hideSpinner('overlaySpinner');
    }

    function containsFiles(evt : DragEvent) {
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
    
    function dragEnter (evt: DragEvent) {
        if (containsFiles(evt)) {
            document.getElementById('dragOverlay').classList.add('show');
            //console.log('dragEnter');
            //console.dir(evt);
        }
    }
    
    function dragLeave (evt: Event) {
        try {
            document.getElementById('dragOverlay').classList.remove('show');
        } catch (err) {
            console.error(err);
        }
        //console.log('dragLeave');
    }
    
    function dropFunc ( evt : DragEvent ) {
        console.log('drop');
        evt.preventDefault();
        const files : any[] = evt.dataTransfer.files as any; //squashes ts error
        
        console.dir(evt.dataTransfer);
        
        //evt.stopPropagation();
        //
            
        for (let file of files ) {
            let fileReader : FileReader = new FileReader();
            fileReader.onload = (function(file) {
                 console.dir(file);
            })(file) as any; //dirty ts hack
            fileReader.readAsDataURL(file);
        }
        dragLeave(evt);
    }

    async function fileSelect () {
        const elem : HTMLInputElement = document.getElementById('fileSourceProxy') as HTMLInputElement
        const options : any = {
            title: `Select video or image sequence`,
            properties: [`openFile`],
            defaultPath: 'c:/',
            filters: [
                {
                    name: 'All Files',
                    extensions: ['*']
                },
            ]
        }
        let files : any;
        let valid : boolean = false;
        let proceed : boolean = false;
        let filePath : string;
        let displayName : string;
        let ext : string;

        try {
            files = await dialog.showOpenDialog(options);
        } catch (err ) {
            console.error(err)
        }

        if (!files || !files.filePaths || files.filePaths.length === 0) {
            return false;
        }

        filePath = files.filePaths[0];

        if (filePath && filePath !== '') {
            ext = extname(filePath.toLowerCase());
            valid = extensions.indexOf(ext) === -1 ? false : true;

            if (!valid) {
                console.log(`Cannot select file ${filePath} is invald`)
                return false;
            }

            displayName = video.set(filePath)
            ipcRenderer.send('info', { filePath } );

            state.set('files', [ filePath ]);
            state.save();

            sonifyStart();
        }
    }
 
    async function fileSave (filePath : string) {
        const options : any = {
            defaultPath: homedir()
        }
        let savePath : string;

        try {
            savePath = await dialog.showSaveDialog(null, options)
        } catch (err) {
            console.error(err);
        }

        if (savePath) {
            ipcRenderer.send('save', { filePath, savePath });
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

        overlayShow(`Sonifying ${displayName}...`);
        ipcRenderer.send('sonify', { state : sonifyState });
    }

    function onSonifyProgress (evt : Event, args : any) {
        let timeLeft : number;
        let timeStr : string;

        if (avgMs !== -1) {
            timeLeft = (args.frames - args.i) * args.ms;
            timeAvg = timeLeft;
        } else {
            avgMs = (avgMs + args.ms) / 2;
            timeLeft = (args.frames - args.i) * avgMs;
            timeAvg = (timeAvg + timeLeft) / 2;
        }

        timeStr = humanizeDuration(Math.round(timeAvg / 1000) * 1000);
        progressMsg.innerText = `~${timeStr}`;
        progressBar.style.width = `${(args.i / args.frames) * 100}%`;

        //console.log(`progress ${args.i}/${args.frames}, time left ${timeLeft / 1000} sec...`);
    }

    function onSonifyComplete (evt : Event, args : any) {
        avgMs = -1;
        timeAvg = -1;
        overlayHide();
        fileSave(args.tmpAudio);
    }

    function playFrame () {
        const source : any = audioContext.createBufferSource();
        let buf : any = audioContext.createBuffer(1, video.height, video.samplerate);
        let mono : any = buf.getChannelData(0);
        let tmp : Float32Array;

        sonify = new Sonify(state, video.canvas);

        tmp = sonify.sonifyCanvas();
        tmp = sonify.fade(tmp);
        mono.set(tmp, 0);
        //console.dir(tmp)
        source.buffer = buf;
        source.connect(audioContext.destination);
        source.start();
    }

    function playSync () {
        video.play();
        //audio.play();
    }

    function keyDown (evt : KeyboardEvent) {
        if (evt.which === 32) {
            video.play();
        }
    }

    function bindListeners () {
        const dropArea : HTMLElement = document.getElementById('dragOverlay');
        const fileSourceProxy : HTMLInputElement = document.getElementById('fileSourceProxy') as HTMLInputElement;
        const sonifyFrame : HTMLButtonElement = document.getElementById('sonifyFrame') as HTMLButtonElement;
        const sonifyVideo : HTMLButtonElement = document.getElementById('sonifyVideo') as HTMLButtonElement;

        document.addEventListener('dragenter',  dragEnter, false);
        dropArea.addEventListener('dragleave',  dragLeave, false);
        dropArea.addEventListener('dragover',   dragEnter, false);
        dropArea.addEventListener('drop',       dropFunc, false);
        document.addEventListener('drop',       dropFunc, false);
        dropArea.addEventListener('dragend',    dragLeave, false);
        dropArea.addEventListener('dragexit',   dragLeave, false);
    
        fileSourceProxy.addEventListener('click', fileSelect, false);
        sonifyFrame.addEventListener('click', playFrame, false);
        sonifyVideo.addEventListener('click', sonifyStart, false);
        document.addEventListener('keydown', keyDown, false);

        ipcRenderer.on('sonify_complete', onSonifyComplete);
        ipcRenderer.on('sonify_progress', onSonifyProgress);

        ipcRenderer.on('info', (evt : Event, args : any) => {
            video.oninfo(evt, args);
            sonify = new Sonify(state, video.canvas);
        });
    }

    /**
     * VISUALIZE
     **/

    async function vFileSelect () {
        const elem : HTMLInputElement = document.getElementById('vFileSourceProxy') as HTMLInputElement
        const options : any = {
            title: `Select MIDI file`,
            properties: [`openFile`],
            defaultPath: 'c:/',
            filters: [
                {
                    name: 'MIDI files',
                    extensions: ['mid', 'midi']
                }
            ]
        }
        let files : any;
        let valid : boolean = false;
        let proceed : boolean = false;
        let filePath : string;
        let displayName : string;
        let ext : string;

        try {
            files = await dialog.showOpenDialog(options);
        } catch (err ) {
            console.error(err)
        }

        if (!files || !files.filePaths || files.filePaths.length === 0) {
            return false;
        }

        filePath = files.filePaths[0];

        if (filePath && filePath !== '') {
            ext = extname(filePath.toLowerCase());
            valid = extensions.indexOf(ext) === -1 ? false : true;

            if (!valid) {
                console.log(`Cannot select file ${filePath} is invald`)
                return false;
            }

            displayName = video.set(filePath)
            ipcRenderer.send('midi', { filePath } );

            state.set('visualize', [ filePath ]);
            state.save();

            visualizeStart();
        }
    }

    function visualizeStart () {
        
    }
    
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
    sonify = new Sonify(state, video.canvas); //need to refresh when settings change
    visualize = new VisualizeMidi(state);

    bindListeners();

})()