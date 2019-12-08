'use strict';
function containsFiles(evt) {
    if (evt.dataTransfer.types) {
        for (var i = 0; i < evt.dataTransfer.types.length; i++) {
            if (evt.dataTransfer.types[i] == "Files") {
                console.dir(evt.dataTransfer.files.length);
                return true;
            }
        }
    }
    return false;
}
function dragEnter(evt) {
    if (containsFiles(evt)) {
        document.getElementById('dragOverlay').classList.add('show');
        console.log('dragEnter');
        console.dir(evt);
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
}
function fileSourceClick() {
    document.getElementById('fileSource').click();
}
function bindListeners() {
    const dropArea = document.getElementById('dragOverlay');
    const fileSource = document.getElementById('fileSourceProxy');
    document.addEventListener('dragenter', dragEnter, false);
    dropArea.addEventListener('dragleave', dragLeave, false);
    dropArea.addEventListener('dragover', dragEnter, false);
    dropArea.addEventListener('drop', drop, false);
    //dropArea.addEventListener('dragend', dragLeave, false);
    fileSource.addEventListener('click', fileSourceClick, false);
}
const test = {};
(function main() {
    const camera = new Camera();
    console.log('ready');
    bindListeners();
})();
//# sourceMappingURL=index.js.map