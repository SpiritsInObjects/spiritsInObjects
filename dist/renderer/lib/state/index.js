'use strict';
const { homedir } = require('os');
const { join } = require('path');
const { outputFile, readFile } = require('fs-extra');
class State {
    constructor() {
        this.localFile = join(homedir(), '.spiritsInObjects/state.sio');
        this.files = [];
        this.camera = null;
        this.start = .72;
        this.end = 1.0;
    }
    async save() {
        const storage = {
            files: this.files,
            camera: this.camera,
            start: this.start,
            end: this.end
        };
        try {
            await outputFile(this.localFile, JSON.stringify(storage), 'utf8');
        }
        catch (err) {
            console.error(err);
        }
    }
    async restore() {
        let storage;
        let raw;
        try {
            raw = await readFile(this.localFile, 'utf8');
        }
        catch (err) {
            console.error(err);
        }
        if (raw) {
            storage = JSON.parse(raw);
            this.files = this.files;
            this.camera = this.camera;
            this.start = this.start;
            this.end = this.end;
        }
    }
    async saveFile(filePath) {
    }
    async restoreFile(filePath) {
    }
}
//# sourceMappingURL=index.js.map