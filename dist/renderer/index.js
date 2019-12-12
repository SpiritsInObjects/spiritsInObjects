'use strict';
//import { ipcRenderer } from 'electron';
const { extname } = require('path');
const { dialog } = require('electron').remote;
let state;
(function main() {
    const EXTENSIONS = ['.mp4', '.mkv', '.mpg'];
    let startMoving = false;
    let endMoving = false;
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
    function drop(evt) {
        const files = evt.dataTransfer.files; //squashes ts error
        console.log('drop');
        console.dir(evt.dataTransfer.files);
        evt.stopPropagation();
        evt.preventDefault();
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
        let pathStr;
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
        pathStr = files.filePaths[0];
        if (pathStr && pathStr !== '') {
            ext = extname(pathStr.toLowerCase());
            valid = EXTENSIONS.indexOf(ext) === -1 ? false : true;
            if (!valid) {
                console.log(`Cannot select file ${pathStr} is invald`);
                return false;
            }
            console.log(`Selected file ${pathStr.split('/').pop()}`);
            state.files = [pathStr];
            displayName = pathStr.split('/').pop();
            elem.value = displayName;
        }
    }
    function beginMoveStart(evt) {
        startMoving = true;
    }
    function endMoveStart(evt) {
        startMoving = false;
    }
    function moveStart(evt) {
        let theatre;
        let width;
        let leftX;
        let newLeftX;
        let maxX;
        let ratio;
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
    function beginMoveEnd(evt) {
        endMoving = true;
    }
    function endMoveEnd(evt) {
        endMoving = false;
    }
    function moveEnd(evt) {
        let theatre;
        let width;
        let leftX;
        let newLeftX;
        let minX;
        let ratio;
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
            document.getElementById('endSelect').style.left = `${ratio * 100}%`;
        }
    }
    function bindListeners() {
        const dropArea = document.getElementById('dragOverlay');
        const fileSourceProxy = document.getElementById('fileSourceProxy');
        const startSelect = document.getElementById('startSelect');
        const endSelect = document.getElementById('endSelect');
        document.addEventListener('dragenter', dragEnter, false);
        dropArea.addEventListener('dragleave', dragLeave, false);
        dropArea.addEventListener('dragover', dragEnter, false);
        document.addEventListener('drop', drop, false);
        dropArea.addEventListener('dragend', dragLeave, false);
        dropArea.addEventListener('dragexit', dragLeave, false);
        fileSourceProxy.addEventListener('click', fileSelect, false);
        startSelect.addEventListener('mousedown', beginMoveStart, false);
        endSelect.addEventListener('mousedown', beginMoveEnd, false);
        document.addEventListener('mousemove', moveStart, false);
        document.addEventListener('mousemove', moveEnd, false);
        document.addEventListener('mouseup', endMoveStart, false);
        document.addEventListener('mouseup', endMoveEnd, false);
    }
    //@ts-ignore why are you like this
    state = new State();
    const camera = new Camera();
    bindListeners();
})();
//# sourceMappingURL=index.js.map