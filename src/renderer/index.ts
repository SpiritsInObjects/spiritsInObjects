'use strict';

//import { ipcRenderer } from 'electron';
const { extname }  = require('path');
const { dialog } = require('electron').remote;

let audioContext : AudioContext;
let state : State;
let video : Video;
let camera : Camera;
let sonify : Sonify;

(function main () {
    const EXTENSIONS : string[] = ['.mp4', '.mkv', '.mpg'];
    let startMoving : boolean = false;
    let endMoving : boolean = false;

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
    
    function drop ( evt : DragEvent ) {
        const files : any[] = evt.dataTransfer.files as any; //squashes ts error
        console.log('drop');
        console.dir(evt.dataTransfer.files);
        
        evt.stopPropagation();
        evt.preventDefault();
            
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
        pathStr = files.filePaths[0]
        if (pathStr && pathStr !== '') {
            ext = extname(pathStr.toLowerCase());
            valid = EXTENSIONS.indexOf(ext) === -1 ? false : true;
            if (!valid) {
                console.log(`Cannot select file ${pathStr} is invald`)
                return false;
            }
            console.log(`Selected file ${pathStr.split('/').pop()}`);
            state.files = [pathStr];
            video.file(pathStr);
            displayName = pathStr.split('/').pop();
            elem.value = displayName;
        }
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
        document.addEventListener('drop',       drop,      false);
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
    }
    
    audioContext = new AudioContext();
    //@ts-ignore why are you like this
    state = new State();
    video = new Video();
    camera = new Camera(video);
    sonify = new Sonify(audioContext, video.canvas);

    bindListeners();
})()

function playFrame () {
    const source = audioContext.createBufferSource();
    source.buffer = sonify.sonifyCanvas();
    source.connect(audioContext.destination);

    // play audio
    source.start();
}