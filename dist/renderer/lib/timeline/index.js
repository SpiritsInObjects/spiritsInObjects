'use strict';
const electronPrompt = require('electron-prompt');
const { extname } = require('path');
const uuid = require('uuid').v4;
class Timeline {
    //playButton
    //exportButton
    constructor() {
        this.canvas = document.getElementById('tCanvas');
        this.binElement = document.getElementById('tBin');
        this.timelineElement = document.getElementById('tElement');
        this.createBtn = document.getElementById('tCreate');
        this.addBtn = document.getElementById('tAdd');
        this.timeline = [];
        this.bin = [];
        this.samples = {};
        this.length = 0;
        this.current = 0;
        this.lastDir = '';
        this.stepSize = 1;
        this.exts = ['.png', '.jpeg', '.jpg'];
        this.keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
            'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
            'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
        this.bindListeners();
    }
    bindListeners() {
        this.binElement.addEventListener('click', this.openBin.bind(this));
        this.createBtn.addEventListener('click', this.create.bind(this));
    }
    openBin() {
        if (this.bin.length === 0) {
            return this.open();
        }
        return false;
    }
    async open() {
        let selectionType = 'multiSelections';
        const options = {
            title: `Select video, image or audio file`,
            properties: [selectionType],
            defaultPath: this.lastDir === '' ? homedir() : this.lastDir,
            filters: [
                {
                    name: 'All Files',
                    extensions: ['*']
                },
            ]
        };
        let files;
        try {
            //@ts-ignore
            files = await dialog.showOpenDialog(options);
        }
        catch (err) {
            console.error(err);
        }
        if (!files || !files.filePaths || files.filePaths.length === 0) {
            return false;
        }
        this.addToBin(files.filePaths);
    }
    validate(files) {
        let valid = false;
        let fileName;
        let ext;
        for (let file of files) {
            //@ts-ignore
            fileName = basename(file);
            ext = extname(fileName.toLowerCase());
            if (this.exts.indexOf(ext) !== -1) {
                valid = true;
            }
            else {
                valid = false;
                this.error('Error loading files', `The file ${fileName} cannot be used in the timeline. Please make a new selection.`);
                break;
            }
        }
        return valid;
    }
    addToBin(files) {
        let bi;
        let ref;
        let index;
        if (!this.validate(files)) {
            return false;
        }
        for (let file of files) {
            if (this.inBin(file)) {
                continue;
            }
            index = this.bin.length;
            ref = typeof this.keys[index] !== 'undefined' ? this.keys[index] : null;
            bi = {
                id: uuid(),
                file,
                //@ts-ignore
                name: basename(file),
                index,
                ref
            };
            this.bin.push(bi);
        }
        this.layoutBin();
    }
    inBin(filePath) {
        let match = this.bin.find((item) => {
            if (item.file === filePath) {
                return true;
            }
            return false;
        });
        return match != null;
    }
    layoutBin() {
        const container = this.binElement.querySelector('table tbody');
        let row;
        let key;
        let name;
        container.innerHTML = '';
        for (let file of this.bin) {
            row = document.createElement('tr');
            key = document.createElement('td');
            name = document.createElement('td');
            if (file.ref) {
                key.innerText = file.ref;
            }
            row.setAttribute('id', file.id);
            name.innerText = file.name;
            row.appendChild(key);
            row.appendChild(name);
            container.appendChild(row);
        }
    }
    async create() {
        const options = {
            title: 'New timeline',
            label: 'Number of frames:',
            value: '255',
            customStylesheet: 'dist/css/style.css',
            inputAttrs: {
                type: 'number'
            },
            type: 'input'
        };
        let res;
        let confirmRes;
        let len;
        if (this.timeline.length > 0) {
            try {
                confirmRes = await this.confirm();
                console.log('got here');
            }
            catch (err) {
                console.error(err);
                return false;
            }
            if (confirmRes.response === 0) {
                return false;
            }
        }
        try {
            res = await electronPrompt(options);
        }
        catch (err) {
            console.error(err);
            return false;
        }
        if (res === null) {
            return false;
        }
        len = parseInt(res, 10);
        this.layout(len);
    }
    async confirm() {
        const options = {
            type: 'question',
            buttons: ['Cancel', 'Yes, please'],
            defaultId: 0,
            title: 'New timeline',
            message: 'Are you sure you want to create a new timeline?',
            detail: 'This will erase your current timeline'
        };
        //@ts-ignore
        return dialog.showMessageBox(null, options);
    }
    error(title, message) {
        //@ts-ignore
        dialog.showErrorBox(title, message);
    }
    layout(len) {
        const container = document.getElementById('tWrapper');
        let frame;
        let between;
        container.innerHTML = '';
        this.timeline = [];
        for (let i = 0; i < len; i++) {
            this.timeline.push(null);
            frame = document.createElement('div');
            frame.classList.add('frame');
            frame.setAttribute('draggable', 'true');
            frame.setAttribute('x', String(i));
            between = document.createElement('div');
            between.classList.add('btw');
            between.setAttribute('x', String(i));
            container.appendChild(frame);
            container.appendChild(between);
        }
    }
    addFrame() {
    }
    moveFrame() {
    }
    expandFrame() {
    }
    contractFrame() {
    }
    export() {
    }
    preview() {
    }
    play() {
    }
}
//# sourceMappingURL=index.js.map