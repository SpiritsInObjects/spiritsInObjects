'use strict';
const electronPrompt = require('electron-prompt');
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
        this.length = 0;
        this.current = 0;
        this.lastDir = '';
        this.bindListeners();
    }
    bindListeners() {
        this.binElement.addEventListener('click', this.openFiles.bind(this));
        this.createBtn.addEventListener('click', this.create.bind(this));
    }
    async openFiles() {
        const options = {
            title: `Select video, image or audio file`,
            properties: [`openFile`],
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
        for (let file of files.filePaths) {
            console.log(files.filePaths);
        }
    }
    async create() {
        const options = {
            title: 'New timeline',
            label: 'Number of frames:',
            value: '0',
            customStylesheet: 'dist/css/style.css',
            inputAttrs: {
                type: 'number'
            },
            type: 'input'
        };
        let res;
        let confirmRes;
        let len;
        //if (this.timeline.length > 0) {
        try {
            confirmRes = await this.confirm();
        }
        catch (err) {
            console.error(err);
            return false;
        }
        console.log('got here');
        console.log(confirmRes);
        //}
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
    confirm() {
        const options = {
            type: 'question',
            buttons: ['Cancel', 'Yes, please'],
            defaultId: 0,
            title: 'New timeline',
            message: 'Are you sure you want to create a new timeline?',
            detail: 'This will erase your current timeline'
        };
        return new Promise((resolve, reject) => {
            //@ts-ignore
            return dialog.showMessageBox(null, options, (res) => {
                console.log('got to callback');
                return resolve(res);
            });
        });
    }
    layout(len) {
        const container = document.getElementById('tWrapper');
        container.innerHTML = '';
        this.timeline = [];
        for (let i = 0; i < len; i++) {
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