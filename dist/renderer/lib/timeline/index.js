'use strict';
const electronPrompt = require('electron-prompt');
const { extname } = require('path');
const uuid = require('uuid').v4;
class Timeline {
    constructor(ui, onBin) {
        this.canvas = document.getElementById('tCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.display = document.getElementById('tCanvasDisplay');
        this.binElement = document.getElementById('tBin');
        this.timelineElement = document.getElementById('tElement');
        this.createBtn = document.getElementById('tCreate');
        this.addBtn = document.getElementById('tAdd');
        this.removeBtn = document.getElementById('tRemove');
        this.importBtn = document.getElementById('tAddBin');
        this.addTimelineBtn = document.getElementById('tAddTimeline');
        this.prev = document.getElementById('tPrevFrame');
        this.next = document.getElementById('tNextFrame');
        this.timeline = [];
        this.bin = [];
        this.lastDir = '';
        this.stepSize = 1;
        this.audioContext = new AudioContext();
        this.exts = ['.png', '.jpeg', '.jpg'];
        this.keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
            'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
            'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
        this.playing = {};
        this.silence = {
            sampleRate: 0
        };
        this.blank = {
            width: 0,
            height: 0
        };
        this.ui = ui;
        this.bindListeners();
        this.state = {
            get: () => { return false; }
        };
        this.onBin = onBin;
    }
    bindListeners() {
        this.binElement.addEventListener('click', this.openBin.bind(this));
        this.importBtn.addEventListener('click', this.open.bind(this));
        this.createBtn.addEventListener('click', this.create.bind(this));
        this.addTimelineBtn.addEventListener('click', this.addTimeline.bind(this));
        this.next.addEventListener('click', this.nextFrame.bind(this));
        this.prev.addEventListener('click', this.prevFrame.bind(this));
        this.addBtn.addEventListener('click', (function () { this.expandTimeline(); }).bind(this));
        this.removeBtn.addEventListener('click', (function () { this.contractTimeline(); }).bind(this));
        document.addEventListener('keydown', this.keyDown.bind(this), false);
        document.addEventListener('keyup', this.keyUp.bind(this), false);
        this.bindGlobal('.frame', 'click', this.clickFrame.bind(this));
        this.bindGlobal('#tBin tbody tr', 'click', this.clickBinImage.bind(this));
        this.bindGlobal('#tBin tbody tr', 'dblclick', this.dblclickBinImage.bind(this));
    }
    bindGlobal(selector, event, handler) {
        const rootElement = document.querySelector('body');
        rootElement.addEventListener(event, function (evt) {
            let targetElement = evt.target;
            while (targetElement != null) {
                if (targetElement.matches(selector)) {
                    handler(evt);
                    return;
                }
                targetElement = targetElement.parentElement;
            }
        }, true);
    }
    clickFrame(evt) {
        //@ts-ignore
        const x = parseInt(evt.target.getAttribute('x'), 10);
        let bi = null;
        let id;
        this.selectFrame(x);
        if (this.timeline[x] != null) {
            id = this.timeline[x].id;
            bi = this.getById(id);
        }
        if (bi != null) {
            this.displayFrame(bi.file);
            this.selectBinImage(bi.id);
        }
        else {
            this.stopDisplay();
        }
    }
    clickBinImage(evt) {
        let id;
        let tr = evt.target;
        let bi;
        if (tr.nodeName === 'TD') {
            tr = tr.parentElement;
        }
        id = tr.id;
        bi = this.getById(id);
        this.selectBinImage(id);
        if (bi) {
            this.displayFrame(bi.file);
        }
    }
    dblclickBinImage(evt) {
        let id;
        let tr = evt.target;
        let bi;
        if (tr.nodeName === 'TD') {
            tr = tr.parentElement;
        }
        id = tr.id;
        bi = this.getById(id);
        this.selectBinImage(id);
        if (bi) {
            this.displayFrame(bi.file);
            this.assignFrame(this.selectedBin, this.selected);
            if (this.selected + 1 <= this.timeline.length - 1) {
                this.selectFrame(this.selected + 1);
            }
        }
    }
    selectBinImage(id) {
        const binImages = document.querySelectorAll('#tBin tbody tr');
        [].forEach.call(binImages, (el) => {
            el.classList.remove('selected');
        });
        this.selectedBin = id;
        document.getElementById(id).classList.add('selected');
    }
    selectFrame(x) {
        const frames = document.querySelectorAll('.frame');
        [].forEach.call(frames, (el) => {
            el.classList.remove('selected');
        });
        this.selected = x;
        document.querySelector(`.frame[x="${x}"]`).classList.add('selected');
    }
    nextFrame() {
        let bi = null;
        let id;
        if (this.selected < this.timeline.length - 1) {
            this.selectFrame(this.selected + 1);
            if (this.timeline[this.selected] != null) {
                id = this.timeline[this.selected].id;
                bi = this.getById(id);
            }
            if (bi != null) {
                this.displayFrame(bi.file);
                this.selectBinImage(bi.id);
            }
            else {
                this.stopDisplay();
            }
        }
    }
    prevFrame() {
        let bi = null;
        let id;
        if (this.selected > 0) {
            this.selectFrame(this.selected - 1);
            if (this.timeline[this.selected] != null) {
                id = this.timeline[this.selected].id;
                bi = this.getById(id);
            }
            if (bi != null) {
                this.displayFrame(bi.file);
                this.selectBinImage(bi.id);
            }
            else {
                this.stopDisplay();
            }
        }
    }
    keyDown(evt) {
        let key = null;
        if (this.ui.currentPage !== 'timeline') {
            return false;
        }
        //console.log(evt.code);
        if (evt.code === 'Backspace') {
            return this.deleteFrame();
        }
        else if (evt.code === 'ArrowRight') {
            return this.nextFrame();
        }
        else if (evt.code === 'ArrowLeft') {
            return this.prevFrame();
        }
        key = this.codeToKey(evt.code, evt.shiftKey);
        if (key) {
            this.playFrame(key);
        }
    }
    keyUp(evt) {
        let key = null;
        if (this.ui.currentPage !== 'timeline') {
            return false;
        }
        key = this.codeToKey(evt.code, evt.shiftKey);
        if (key) {
            this.stopFrame(key);
        }
    }
    codeToKey(code, shiftKey) {
        let key = null;
        if (code.indexOf('Key') === 0) {
            key = code.replace('Key', '');
            if (!shiftKey) {
                key = key.toLowerCase();
            }
        }
        else if (code.indexOf('Digit') === 0) {
            key = code.replace('Digit', '');
        }
        return key;
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
    async addToBin(files) {
        let bi;
        let key;
        let index;
        let image = null;
        let count = 0;
        if (!this.validate(files)) {
            return false;
        }
        this.ui.overlay.show(`Importing ${files.length} images to Bin...`);
        for (let file of files) {
            this.ui.overlay.progress(count / files.length, `${basename(file)}`);
            count++;
            if (this.inBin(file)) {
                continue;
            }
            index = this.bin.length;
            key = typeof this.keys[index] !== 'undefined' ? this.keys[index] : null;
            bi = {
                id: uuid(),
                file,
                //@ts-ignore
                name: basename(file),
                index,
                key,
                samples: null
            };
            try {
                bi.samples = await this.preProcess(file);
            }
            catch (err) {
                console.error(err);
            }
            if (this.canvas.width > this.blank.width || this.canvas.height > this.blank.height) {
                this.generateBlank(this.canvas.width, this.canvas.height);
            }
            if (bi.samples.length * 24 > this.silence.sampleRate) {
                this.generateSilence(bi.samples.length);
            }
            if (extname(file.toLowerCase()) !== '.png') {
                image = await this.imageData(file);
            }
            else {
                image = null;
            }
            this.bin.push(bi);
            this.onBin(bi, image);
        }
        this.ui.overlay.progress(1.0, `Cleaning up...`);
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
    getByKey(key) {
        let match = this.bin.find((item) => {
            if (item.key === key) {
                return true;
            }
            return false;
        });
        return match;
    }
    getById(id) {
        let match = this.bin.find((item) => {
            if (item.id === id) {
                return true;
            }
            return false;
        });
        return match;
    }
    getByIndex(x) {
        let match = this.bin.find((el) => {
            if (el.index === x) {
                return true;
            }
            return false;
        });
        return match;
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
            if (file.key) {
                key.innerText = file.key;
            }
            row.setAttribute('id', file.id);
            name.innerText = file.name;
            row.appendChild(key);
            row.appendChild(name);
            container.appendChild(row);
        }
        this.ui.overlay.hide();
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
        this.selected = 0;
        if (this.timeline.length > 0) {
            try {
                confirmRes = await this.confirm();
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
        this.timeline = [];
        for (let i = 0; i < len; i++) {
            this.timeline.push(null);
        }
        this.layout();
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
    layout() {
        const len = this.timeline.length;
        const container = document.getElementById('tWrapper');
        let frame;
        let between;
        let bi;
        container.innerHTML = '';
        this.endTC = new Timecode(len, 24, false);
        document.getElementById('tEndTimecode').value = this.endTC.toString();
        for (let i = 0; i < len; i++) {
            frame = document.createElement('div');
            frame.classList.add('frame');
            frame.setAttribute('draggable', 'true');
            frame.setAttribute('x', String(i));
            if (i === this.selected) {
                frame.classList.add('selected');
            }
            if (this.timeline[i] != null) {
                bi = this.getById(this.timeline[i].id);
                frame.innerText = bi.key;
            }
            between = document.createElement('div');
            between.classList.add('btw');
            between.setAttribute('x', String(i));
            container.appendChild(frame);
            container.appendChild(between);
        }
        this.addBtn.classList.remove('hide');
        this.removeBtn.classList.remove('hide');
    }
    async preProcess(filePath) {
        return new Promise(async (resolve, reject) => {
            this.stillLoader = new Image();
            this.stillLoader.onload = (function () {
                const width = this.stillLoader.naturalWidth;
                const height = this.stillLoader.naturalHeight;
                let buffer;
                this.canvas.width = width;
                this.canvas.height = height;
                this.ctx.drawImage(this.stillLoader, 0, 0, width, height);
                this.sonify = new Sonify(this.state, this.canvas, this.audioContext);
                buffer = this.sonify.sonifyCanvas();
                return resolve(buffer);
            }).bind(this);
            this.stillLoader.setAttribute('src', filePath);
        });
    }
    async imageData(filePath) {
        return new Promise(async (resolve, reject) => {
            this.stillLoader = new Image();
            this.stillLoader.onload = (function () {
                const width = this.stillLoader.naturalWidth;
                const height = this.stillLoader.naturalHeight;
                let imageData;
                this.canvas.width = width;
                this.canvas.height = height;
                this.ctx.drawImage(this.stillLoader, 0, 0, width, height);
                imageData = this.ctx.getImageData(0, 0, width, height);
                return resolve({ data: imageData.data, width, height });
            }).bind(this);
            this.stillLoader.setAttribute('src', filePath);
        });
    }
    playFrame(key) {
        let bi;
        let buf;
        let mono;
        if (typeof this.playing[key] !== 'undefined') {
            return false;
        }
        bi = this.getByKey(key);
        if (bi != null) {
            this.displayFrame(bi.file);
            this.selectBinImage(bi.id);
            this.playing[key] = this.audioContext.createBufferSource();
            buf = this.audioContext.createBuffer(1, bi.samples.length, bi.samples.length * 24);
            mono = buf.getChannelData(0);
            mono.set(bi.samples, 0);
            this.playing[key].buffer = buf;
            this.playing[key].loop = true;
            this.playing[key].connect(this.audioContext.destination);
            this.playing[key].start();
        }
    }
    stopFrame(key) {
        if (typeof this.playing[key] !== 'undefined') {
            this.playing[key].stop();
            delete this.playing[key];
        }
        //this.stopDisplay();
        return false;
    }
    displayFrame(filePath) {
        this.display.setAttribute('src', filePath);
        try {
            this.display.classList.remove('hide');
        }
        catch (err) {
            //
        }
    }
    stopDisplay() {
        try {
            this.display.classList.add('hide');
        }
        catch (err) {
            //
        }
        this.display.setAttribute('src', '#');
    }
    addTimeline() {
        let bi;
        if (this.selectedBin != null) {
            bi = this.getById(this.selectedBin);
            this.assignFrame(this.selectedBin, this.selected);
            if (this.selected + 1 <= this.timeline.length - 1) {
                this.selectFrame(this.selected + 1);
            }
        }
        //console.log(`${this.selected} = ${bi.id}`)
    }
    assignFrame(id, x, count = 1) {
        for (let i = 0; i < count; i++) {
            this.timeline[x + i] = { id };
        }
        this.layout();
    }
    deleteFrame() {
        if (this.timeline.length === 0) {
            return false;
        }
        this.timeline[this.selected] = null;
        this.selected--;
        this.layout();
    }
    expandTimeline(steps = 1) {
        for (let i = 0; i < steps; i++) {
            this.timeline.push(null);
        }
        this.layout();
    }
    contractTimeline(steps = 1) {
        for (let i = 0; i < steps; i++) {
            if (this.timeline.length > 0) {
                this.timeline.pop();
            }
        }
        this.layout();
    }
    generateBlank(width, height) {
        const blank = {
            id: 'blank',
            file: null,
            name: null,
            index: -1,
            key: null,
            samples: null
        };
        const image = {
            width,
            height
        };
        let imageData;
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx.fillStyle = "#000000";
        this.ctx.fillRect(0, 0, width, height);
        imageData = this.ctx.getImageData(0, 0, width, height);
        image.data = imageData.data;
        this.blank.width = width;
        this.blank.height = height;
        this.onBin(blank, image);
    }
    generateSilence(sampleLength) {
        const silence = {
            id: 'silence',
            file: null,
            name: null,
            index: -1,
            key: null,
            samples: new Float32Array(sampleLength)
        };
        const image = null;
        for (let i = 0; i < sampleLength; i++) {
            silence.samples[i] = 0.0;
        }
        this.silence.sampleRate = sampleLength * 24;
        this.onBin(silence, image);
    }
    moveFrame() {
    }
    expandFrame() {
    }
    contractFrame() {
    }
    export() {
        const timeline = this.timeline.map((step) => (step && step.id) ? step.id : null);
        return timeline;
    }
    preview() {
        const timeline = this.timeline.map((step) => (step && step.id) ? step.id : null);
        return timeline;
    }
    play() {
    }
}
//# sourceMappingURL=index.js.map