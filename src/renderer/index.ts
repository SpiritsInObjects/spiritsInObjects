'use strict';

import { extname } from 'path';

const { ipcRenderer } = require('electron');
const { dialog } = require('electron').remote;
const humanizeDuration = require('humanize-duration');

let audioContext : AudioContext;
let state : State;
let video : Video;
let camera : Camera;
let sonify : Sonify;

(function main () {
    const extensions : string[] = ['.mp4', '.mkv', '.mpg', '.mpeg'];
    let startMoving : boolean = false;
    let endMoving : boolean = false;

    async function confirm (message : string) {
        const config = {
            buttons : ['Yes', 'Cancel'],
            message
        }
        const res = await dialog.showMessageBox(config);
        return res.response === 0;
    };

    function overlayShow (msg : string = '') {
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
        let pathStr : string;
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

        pathStr = files.filePaths[0];

        if (pathStr && pathStr !== '') {
            ext = extname(pathStr.toLowerCase());
            valid = extensions.indexOf(ext) === -1 ? false : true;

            if (!valid) {
                console.log(`Cannot select file ${pathStr} is invald`)
                return false;
            }
            console.log(`Selected file ${pathStr.split('/').pop()}`);
            
            video.file(pathStr);

            displayName = pathStr.split('/').pop();
            elem.value = displayName;

            ipcRenderer.send('file', { filePath : pathStr });

            state.files = [pathStr];
            state.save();

            proceed = await confirm(`Sonify ${displayName}?`);

            if (proceed) {
                sonifyStart(displayName);
            }
        }
    }
    let audioBuffer : AudioBuffer;
    let monoBuffer : Float32Array;  
    //@ts-ignore
    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    function sonifyStart (displayName : string) {
        //audioBuffer = audioCtx.createBuffer(1, state.samplerate * state.frames, state.samplerate);
        //monoBuffer = audioBuffer.getChannelData(0);   

        overlayShow(`Sonifying ${displayName}...`);
        ipcRenderer.send('sonify', { state : state.get() });
    }

    let avgMs : number = -1;
    const progressBar : any = document.getElementById('overlayProgressBar');
    const progressMsg : any = document.getElementById('overlayProgressMsg')
    function onSonifyProgress (evt : Event, args : any) {
        let timeLeft : number;
        let timeStr : string;
        if (avgMs !== -1) {
            timeLeft = (args.frames - args.i) * args.ms;
        } else {
            avgMs = (avgMs + args.ms) / 2;
            timeLeft = (args.frames - args.i) * avgMs;
        }
        timeStr = humanizeDuration(timeLeft)
        progressMsg.innerText = `Time left: ~${timeStr}`;
        progressBar.style.width = `${(args.i / args.frames) * 100}%`;

        console.log(`progress ${args.i}/${args.frames}, time left ${timeLeft / 1000} sec...`);
        console.log( args.i * args.samples.length + ' -> ' + (args.i + 1) * args.samples.length)
        //for (let i : number = args.i * args.samples.length; i < (args.i + 1) * args.samples.length; i++) {
            //monoBuffer[i] = args.samples[i];
        //}
    }

    function onSonifyComplete (evt : Event, args : any) {
        avgMs = -1;
        overlayHide();
        setTimeout(() => {
            //var source = audioCtx.createBufferSource();
            //source.buffer = audioBuffer;
            //source.connect(audioCtx.destination);
            //source.start();
        })
    }

    function beginMoveStart (evt: MouseEvent) {
        startMoving = true;
    }

    function endMoveStart (evt: MouseEvent) {
        startMoving = false;
    }

    function moveStart (evt : MouseEvent) {
        let theatre : HTMLElement;
        let width : number;
        let leftX : number;
        let newLeftX : number;
        let maxX : number;
        let ratio : number;

        if (startMoving) {
            theatre = document.getElementById('theatre');
            width = theatre.clientWidth;
            leftX = theatre.offsetLeft;
            maxX = document.getElementById('endSelect').offsetLeft - 1;
            newLeftX = evt.pageX - leftX;
            if (newLeftX <= 0) {
                newLeftX = 0;
            }
            if (newLeftX >= maxX) {
                newLeftX = maxX;
            }
            ratio = newLeftX / width;
            document.getElementById('startSelect').style.left = `${ratio * 100}%`;
        }
    }

    function beginMoveEnd (evt: MouseEvent) {
        endMoving = true;
    }

    function endMoveEnd (evt: MouseEvent) {
        endMoving = false;
    }

    function moveEnd (evt : MouseEvent) {
        let theatre : HTMLElement;
        let width : number;
        let leftX : number;
        let newLeftX : number;
        let minX : number;
        let ratio : number;

        if (endMoving) {
            theatre = document.getElementById('theatre');
            width = theatre.clientWidth;
            leftX = theatre.offsetLeft;
            
            minX = document.getElementById('startSelect').offsetLeft + 1;
            newLeftX = evt.pageX - leftX;
            if (newLeftX <= minX) {
                newLeftX = minX;
            }
            if (newLeftX >= width) {
                newLeftX = width;
            }
            ratio = newLeftX / width;
            document.getElementById('endSelect').style.left = `${ratio * 100}%`
        }
    }

    function keyDown (evt : KeyboardEvent) {
        if (evt.which === 32) {
            video.play();
        }
    }

    function videoPlay (evt : MouseEvent) {
        video.play();
    }

    function bindListeners () {
        const dropArea : HTMLElement = document.getElementById('dragOverlay');
        const fileSourceProxy : HTMLInputElement = document.getElementById('fileSourceProxy') as HTMLInputElement;
        const startSelect : HTMLElement = document.getElementById('startSelect');
        const endSelect : HTMLElement = document.getElementById('endSelect');
        const playButton : HTMLButtonElement = document.getElementById('play') as HTMLButtonElement;

        document.addEventListener('dragenter',  dragEnter, false);
    
        dropArea.addEventListener('dragleave',  dragLeave, false);
        dropArea.addEventListener('dragover',   dragEnter, false);
        dropArea.addEventListener('drop',       dropFunc, false);
        document.addEventListener('drop',       dropFunc, false);
        dropArea.addEventListener('dragend',    dragLeave, false);
        dropArea.addEventListener('dragexit',   dragLeave, false);
    
        fileSourceProxy.addEventListener('click', fileSelect, false);

        startSelect.addEventListener('mousedown', beginMoveStart, false);
        endSelect.addEventListener('mousedown', beginMoveEnd, false);

        document.addEventListener('mousemove', moveStart, false);
        document.addEventListener('mousemove', moveEnd, false);
        document.addEventListener('mouseup', endMoveStart, false);
        document.addEventListener('mouseup', endMoveEnd, false);

        document.addEventListener('keydown', keyDown, false);
        playButton.addEventListener('click', videoPlay, false);

        ipcRenderer.on('sonify_complete', onSonifyComplete);
        ipcRenderer.on('sonify_progress', onSonifyProgress);
    }
    
    audioContext = new AudioContext();
    //@ts-ignore why are you like this
    state = new State();
    video = new Video(state);
    camera = new Camera(video);
    sonify = new Sonify(state, audioContext, video.canvas);

    bindListeners();
})()

function playFrame () {
    const source = audioContext.createBufferSource();
    source.buffer = sonify.sonifyCanvas();
    source.connect(audioContext.destination);

    // play audio
    source.start();
}