'use strict';
const { homedir } = require('os');
const { join } = require('path');
const { outputFile, readFile, pathExists } = require('fs-extra');
class State {
    constructor() {
        this.localFile = join(homedir(), '.spiritsInObjects/state.sio');
        this.files = [];
        this.camera = null;
        this.start = .72;
        this.end = 1.0;
        this.framerate = 24;
        this.frames = 0;
        this.width = 0;
        this.height = 0;
        this.samplerate = 0;
        this.restore();
    }
    /**
     * Save the state as JSON to local file in the home directory
     */
    async save() {
        const storage = {
            files: this.files,
            camera: this.camera,
            start: this.start,
            end: this.end,
            framerate: this.framerate,
            frames: this.frames,
            width: this.width,
            samplerate: this.samplerate
        };
        try {
            await outputFile(this.localFile, JSON.stringify(storage, null, '\t'), 'utf8');
        }
        catch (err) {
            console.error(err);
        }
    }
    /**
     * Restore the state from the saved JSON file to the state class
     */
    async restore() {
        let storage;
        let raw;
        let fileExists = false;
        try {
            fileExists = await pathExists(this.localFile);
        }
        catch (err) {
            console.error(err);
            return false;
        }
        if (!fileExists) {
            return false;
        }
        try {
            raw = await readFile(this.localFile, 'utf8');
        }
        catch (err) {
            console.error(err);
        }
        if (raw) {
            try {
                storage = JSON.parse(raw);
            }
            catch (err) {
                console.log(err);
                console.log(raw);
                return false;
            }
            this.files = storage.files;
            this.camera = storage.camera;
            this.start = storage.start;
            this.end = storage.end;
            this.framerate = storage.framerate;
            this.frames = storage.frames;
            this.width = storage.width;
            this.height = storage.height;
            this.samplerate = storage.samplerate;
        }
    }
    /**
     * Get the current state as an object.
     */
    get() {
        return {
            files: this.files,
            camera: this.camera,
            start: this.start,
            end: this.end,
            framerate: this.framerate,
            frames: this.frames,
            width: this.width,
            height: this.height,
            samplerate: this.samplerate
        };
    }
}
//# sourceMappingURL=index.js.map