'use strict';

//import { ipcRenderer } from 'electron';


(function main () {
    function containsFiles(evt : DragEvent) {
        if (evt.dataTransfer.types) {
            for (var i = 0; i < evt.dataTransfer.types.length; i++) {
                if (evt.dataTransfer.types[i] == "Files") {
                    console.dir(evt.dataTransfer.files.length)
                    return true;
                }
            }
        }
        return false;
    }
    
    function dragEnter (evt: DragEvent) {
        if (containsFiles(evt)) {
            document.getElementById('dragOverlay').classList.add('show');
            console.log('dragEnter');
            console.dir(evt);
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
    }
    
    function fileSourceClick () {
        console.log('happens')
        document.getElementById('fileSource').click();
    }
    
    function bindListeners () {
        const dropArea : HTMLElement = document.getElementById('dragOverlay');
        const fileSource : HTMLInputElement = document.getElementById('fileSourceProxy') as HTMLInputElement;
    
        document.addEventListener('dragenter',  dragEnter, false);
    
        dropArea.addEventListener('dragleave',  dragLeave, false);
        dropArea.addEventListener('dragover',   dragEnter, false);
        dropArea.addEventListener('drop',       drop, false);
        //dropArea.addEventListener('dragend', dragLeave, false);
    
        fileSource.addEventListener('click', fileSourceClick, false);
    }

    const camera : Camera = new Camera() as Camera
    console.log('ready');
    bindListeners();
})()